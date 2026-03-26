package routes

import (
	"bakonpancakz/homepage/env"
	"bakonpancakz/homepage/include"
	"bytes"
	"compress/gzip"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"text/template"
)

var articleCache sync.Map

func PrepareBlogArticles(notFoundHandler HttpHandler) HttpHandler {
	return func(w http.ResponseWriter, r *http.Request) {
		for _, art := range env.Database.Articles {
			if strings.Compare(art.Slug, r.PathValue("slug")) == 0 {

				compress := strings.Contains(r.Header.Get("Accept-Encoding"), "gzip")
				cacheKeyStandard := fmt.Sprintf("art_%s_%t", art.Slug, true)
				cacheKeyCompress := fmt.Sprintf("art_%s_%t", art.Slug, false)

				// Check Browser Cache
				if r.Header.Get("If-None-Match") == env.VERSION {
					w.WriteHeader(http.StatusNotModified)
					return
				}

				// Check Template Cache
				w.Header().Set("ETag", env.VERSION)
				w.Header().Set("Content-Type", "text/html")
				w.Header().Set("Cache-Control", "public, max-age=3600, must-revalidate")
				if compress {
					if v, ok := articleCache.Load(cacheKeyCompress); ok {
						w.Header().Set("Content-Encoding", "gzip")
						w.Write(v.([]byte))
						return
					}
				} else {
					if v, ok := articleCache.Load(cacheKeyStandard); ok {
						w.Write(v.([]byte))
						return
					}
				}

				// Render Document
				tmpl, err := template.ParseFS(
					include.Templates,
					include.PreparePath(include.Templates, "base.html"),
					include.PreparePath(include.Templates, "blog_article.html"),
					include.PreparePath(include.Templates, fmt.Sprint("articles/", art.BaseTemplate)),
					include.PreparePath(include.Templates, "icons/logo_facebook.svg"),
					include.PreparePath(include.Templates, "icons/logo_linkedin.svg"),
					include.PreparePath(include.Templates, "icons/logo_x.svg"),
					include.PreparePath(include.Templates, "icons/icon_top.svg"),
					include.PreparePath(include.Templates, "icons/icon_home.svg"),
					include.PreparePath(include.Templates, "icons/icon_share.svg"),
					include.PreparePath(include.Templates, "icons/icon_stack.svg"),
				)
				if err != nil {
					log.Println("[routes/blog] Template Error:", err)
					w.WriteHeader(http.StatusInternalServerError)
					return
				}

				var b bytes.Buffer
				if err = tmpl.ExecuteTemplate(&b, "base.html", map[string]any{
					"Title":   art.Title,
					"Version": env.VERSION,
					"Site":    env.Database.Site,
					"Article": art,
				}); err != nil {
					log.Println("[routes/blog] Template Error:", err)
					w.WriteHeader(http.StatusInternalServerError)
					return
				}

				// Compress Document
				var c bytes.Buffer
				g := gzip.NewWriter(&c)
				g.Write(b.Bytes())
				g.Close()

				if include.Embedded {
					articleCache.Store(cacheKeyStandard, b.Bytes())
					articleCache.Store(cacheKeyCompress, c.Bytes())
				}

				// Send Document
				if compress {
					w.Header().Set("Content-Encoding", "gzip")
					w.Write(c.Bytes())
				} else {
					w.Write(b.Bytes())
				}
				return
			}
		}
		notFoundHandler(w, r)
	}
}
