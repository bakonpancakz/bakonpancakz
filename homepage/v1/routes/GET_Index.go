package routes

import (
	"bakonpancakz/homepage/env"
	"bakonpancakz/homepage/include"
	"net/http"
)

func GET_Index(notFoundHandler HttpHandler) HttpHandler {

	handler := ServeStaticTemplate(&ServeTemplateInfo{
		FileSystem: include.Templates,
		FilePaths:  []string{"base.html", "homepage.html"},
		Filename:   "homepage.html",
		Literals: map[string]any{
			"Title":   "Home",
			"Version": env.VERSION,
			"Site":    env.Database.Site,
		},
	})

	return func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			handler(w, r)
			return
		}
		if r.Method == http.MethodGet {
			notFoundHandler(w, r)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}
