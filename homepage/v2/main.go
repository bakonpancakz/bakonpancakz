package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"os/signal"
	"path"
	"strings"
	"sync"
	"syscall"
	"text/template"
	"time"
)

type ManifestArticle struct {
	ID                string    `json:"id"`
	BannerMain        string    `json:"banner_main"`
	BannerList        string    `json:"banner_list"`
	BannerDescription string    `json:"banner_description"`
	Date              time.Time `json:"date"`
	Title             string    `json:"title"`
	Description       string    `json:"description"`
	Author            string    `json:"author"`
	Tags              []string  `json:"tags"`
}

type ManifestNode struct {
	ID          string `json:"id"`
	Icon        string `json:"icon"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type Manifest struct {
	Links    []ManifestNode    `json:"links"`
	Authors  []ManifestNode    `json:"authors"`
	Tags     []ManifestNode    `json:"tags"`
	Articles []ManifestArticle `json:"articles"`
}

type CacheInfo struct {
	HeaderETag        string
	HeaderContentType string
	ContentPlainText  []byte
	ContentCompressed []byte
}

var (
	MANIFEST      Manifest
	MANIFEST_RAW  string
	HTTP_ADDRESS  = os.Getenv("HTTP_ADDRESS")
	CACHE_VERSION = fmt.Sprintf("%X", time.Now().Unix())
)

func init() {
	// Default Values
	if HTTP_ADDRESS == "" {
		HTTP_ADDRESS = "127.0.0.1:8080"
	}

	// Manifest Parsing
	data, err := os.ReadFile("public/blog/manifest.json")
	if err != nil {
		log.Fatalln("Cannot Read Manifest JSON:", err)
	}
	if err := json.Unmarshal(data, &MANIFEST); err != nil {
		log.Fatalln("Cannot Parse Manifest JSON:", err)
	}
	MANIFEST_RAW = string(data)
}

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
	mux := http.NewServeMux()
	loc := map[string]any{
		"Version": CACHE_VERSION,
	}

	// Webpage Endpoints //
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			ServeTemplate(w, r, "templates/home.html", loc)
			return
		}
		if r.Method == http.MethodGet {
			ServeTemplate(w, r, "templates/404.html", loc)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	})
	mux.HandleFunc("/blog/{slug...}", func(w http.ResponseWriter, r *http.Request) {

		// Although this is a SPA, we still need to render
		// the OG meta tags for SEO / Social Media Sites

		var article *ManifestArticle
		for _, art := range MANIFEST.Articles {
			if strings.EqualFold(art.ID, r.PathValue("slug")) {
				article = &art
				break
			}
		}
		ServeTemplate(w, r, "templates/blog.html", map[string]any{
			"Version":     CACHE_VERSION,
			"ManifestRaw": html.EscapeString(MANIFEST_RAW),
			"Manifest":    MANIFEST,
			"Article":     article,
		})
	})

	// Secret Endpoints //
	mux.HandleFunc("/secret/sprites", func(w http.ResponseWriter, r *http.Request) {
		ServeTemplate(w, r, "templates/secret_sprites.html", loc)
	})
	mux.HandleFunc("/secret/picross", func(w http.ResponseWriter, r *http.Request) {
		ServeTemplate(w, r, "templates/secret_picross_board.html", loc)
	})
	mux.HandleFunc("/secret/picross/award", func(w http.ResponseWriter, r *http.Request) {
		ServeTemplate(w, r, "templates/secret_picross_award.html", loc)
	})

	// Special Endpoints //
	mux.HandleFunc("/blog/rss.xml", func(w http.ResponseWriter, r *http.Request) {
		ServeTemplate(w, r, "templates/rss.xml", map[string]any{
			"Version":  CACHE_VERSION,
			"Manifest": MANIFEST,
			"Date":     time.Now().UTC().Format(time.RFC1123),
			"RFC1123":  time.RFC1123,
		})
	})
	mux.HandleFunc("/sitemap.xml", func(w http.ResponseWriter, r *http.Request) {
		ServeTemplate(w, r, "templates/sitemap.xml", map[string]any{
			"Version":  CACHE_VERSION,
			"Manifest": MANIFEST,
			"Date":     time.Now().UTC().Format("2006-01-02"),
			"Locations": []string{
				"https://panca.kz/",
				"https://panca.kz/blog",
			},
		})
	})
	mux.HandleFunc("/qr", func(w http.ResponseWriter, r *http.Request) {
		redirects := []string{
			"https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Risk Astley - Never Gonna Give You Up
			"https://www.youtube.com/watch?v=DnmHG3mJv1o", // Masayoshi Takanaka - Tropic Birds
			"https://www.youtube.com/watch?v=ZZCt92zLmLI", // Blur - Intermission
			"https://www.twitch.tv/robcdee",               // awesome sauce
			"https://piapro.net/intl/en.html",             // mikudayooo
		}
		index := int(time.Now().Unix()/60) % len(redirects) // rotate every minute
		http.Redirect(w, r, redirects[index], http.StatusTemporaryRedirect)
	})

	// Resource Endpoints //
	mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		ServeFile(w, r, "favicon.ico")
	})
	mux.HandleFunc("/robots.txt", func(w http.ResponseWriter, r *http.Request) {
		ServeFile(w, r, "robots.txt")
	})
	mux.HandleFunc("/public/{path...}", func(w http.ResponseWriter, r *http.Request) {
		ServeFile(w, r, path.Clean(r.PathValue("path")))
	})

	// Create HTTP Server //
	svr := http.Server{
		Handler:           mux,
		Addr:              HTTP_ADDRESS,
		MaxHeaderBytes:    4096,
		IdleTimeout:       5 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		ReadTimeout:       30 * time.Second,
	}

	await.Add(1)
	go func() {
		defer await.Done()
		<-stop.Done()
		svr.Shutdown(context.Background())
		log.Println("[http] Cleaned up HTTP")
	}()

	log.Printf("[http] Listening @ %s\n", svr.Addr)
	if err := svr.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalln("[http] Listen Error:", err)
	}

}

func ServeTemplate(w http.ResponseWriter, r *http.Request, filepath string, locals any) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	clientCacheKey := r.Header.Get("If-None-Match")
	clientCompress := strings.Contains(r.Header.Get("Accept-Encoding"), "gzip")

	// Render Template //
	html := bytes.Buffer{}
	tmpl, err := template.ParseFiles(filepath)
	if err != nil {
		log.Printf("[http] Cannot parse template '%s': %s\n", filepath, err)
		return
	}
	if err := tmpl.Execute(&html, locals); err != nil {
		log.Printf("[http] Cannot render template '%s': %s \n", filepath, err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Cache Validation //
	serverCacheKey := fmt.Sprintf("%x", md5.Sum(html.Bytes()))
	serverFileType := mime.TypeByExtension(path.Ext(filepath))
	if strings.EqualFold(clientCacheKey, serverCacheKey) {
		w.WriteHeader(http.StatusNotModified)
		return
	}

	// Stream Contents //
	w.Header().Set("ETag", serverCacheKey)
	w.Header().Set("Content-Type", serverFileType)
	// w.Header().Set("Cache-Control", "public, max-age=3600, must-revalidate")

	if clientCompress {
		w.Header().Set("Content-Encoding", "gzip")
		pack := gzip.NewWriter(w)
		pack.Write(html.Bytes())
		pack.Close()
	} else {
		w.Write(html.Bytes())
	}
}

func ServeFile(w http.ResponseWriter, r *http.Request, filepath string) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Open File //
	file, err := os.Open("./public/" + filepath)
	if err != nil {
		if os.IsNotExist(err) {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		log.Printf("[http] Cannot open file '%s': %s\n", filepath, err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Skip Compression on Large/Media Files //
	serverFileType := mime.TypeByExtension(path.Ext(filepath))
	clientCompress := strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") &&
		!strings.Contains(serverFileType, "image") &&
		!strings.Contains(serverFileType, "audio") &&
		!strings.Contains(serverFileType, "video")

	// Stream Contents //
	w.Header().Set("Content-Type", serverFileType)
	w.Header().Set("X-Robots-Tag", "noindex")
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")

	if clientCompress {
		w.Header().Set("Content-Encoding", "gzip")
		pack := gzip.NewWriter(w)
		io.Copy(pack, file)
		pack.Close()
	} else {
		io.Copy(w, file)
	}
}
