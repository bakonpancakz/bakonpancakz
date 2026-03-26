package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path"
	"sync"
	"syscall"
	"time"

	"bakonpancakz/homepage/env"
	"bakonpancakz/homepage/include"
	"bakonpancakz/homepage/routes"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	// Startup Services
	var stopCtx, stop = context.WithCancel(context.Background())
	var stopWg sync.WaitGroup
	go SetupHTTP(stopCtx, &stopWg)

	// Await Shutdown Signal
	cancel := make(chan os.Signal, 1)
	signal.Notify(cancel, syscall.SIGINT, syscall.SIGTERM)
	<-cancel
	stop()

	// Begin Shutdown Process
	timeout, finish := context.WithTimeout(context.Background(), time.Minute)
	defer finish()
	go func() {
		<-timeout.Done()
		if timeout.Err() == context.DeadlineExceeded {
			log.Fatalln("[main] Cleanup timeout! Exiting now.")
		}
	}()
	stopWg.Wait()
	log.Println("[main] All done, bye bye!")
	os.Exit(0)
}

func SetupHTTP(stop context.Context, await *sync.WaitGroup) {

	notFoundHandler := routes.ServeStaticTemplate(&routes.ServeTemplateInfo{
		FileSystem: include.Templates,
		FilePaths:  []string{"generate_404.html"},
		Filename:   "generate_404.html",
		Literals: map[string]any{
			"Site": env.Database.Site,
		},
	})

	mux := http.NewServeMux()
	mux.HandleFunc("/", routes.GET_Index(notFoundHandler))
	mux.HandleFunc("/blog", routes.ServeStaticTemplate(&routes.ServeTemplateInfo{
		FileSystem: include.Templates,
		FilePaths:  []string{"base.html", "blog_browser.html"},
		Filename:   "blog_browser.html",
		Literals: map[string]any{
			"Title":    "Browser",
			"Version":  env.VERSION,
			"Site":     env.Database.Site,
			"Articles": env.Database.Articles,
		},
	}))
	mux.HandleFunc("/rss.xml", routes.ServeStaticTemplate(&routes.ServeTemplateInfo{
		FileSystem:  include.Templates,
		FilePaths:   []string{"generate_rss.html"},
		Filename:    "generate_rss.html",
		ContentType: "application/rss+xml",
		Literals: map[string]any{
			"Site":      env.Database.Site,
			"Articles":  env.Database.Articles,
			"RFC1123":   time.RFC1123,
			"BuildDate": time.Now(),
		},
	}))
	mux.HandleFunc("/blog/{slug}", routes.PrepareBlogArticles(notFoundHandler))
	mux.HandleFunc("/favicon.ico", routes.ServeStaticFile("favicon.ico"))
	mux.HandleFunc("/robots.txt", routes.ServeStaticFile("robots.txt"))
	mux.HandleFunc("/public/{path...}", func(w http.ResponseWriter, r *http.Request) {
		routes.ServePublicFile(w, r, path.Clean(r.PathValue("path")))
	})

	svr := http.Server{
		Handler:           mux,
		Addr:              env.HTTP_ADDRESS,
		TLSConfig:         env.HTTP_TLS,
		MaxHeaderBytes:    4096,
		IdleTimeout:       5 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		ReadTimeout:       30 * time.Second,
	}

	// Shutdown Logic
	await.Add(1)
	go func() {
		defer await.Done()
		<-stop.Done()
		svr.Shutdown(context.Background())
		log.Println("[http] Cleaned up HTTP")
	}()

	// Server Startup
	var err error
	if env.TLS_ENABLED {
		log.Printf("[http] Bound HTTPS - %s\n", svr.Addr)
		err = svr.ListenAndServeTLS("", "")
	} else {
		log.Printf("[http] Bound HTTP - %s\n", svr.Addr)
		err = svr.ListenAndServe()
	}
	if err != http.ErrServerClosed {
		log.Fatalln("[http] Listen Error:", err)
	}
}
