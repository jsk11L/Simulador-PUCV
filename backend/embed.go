package main

import (
	"embed"
	"io"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// frontendFS embebe el resultado de `npm run build` (`frontend/dist`)
// copiado por el build script a `backend/frontend_dist`. En desarrollo
// el directorio solo contiene un placeholder — `mountFrontend` detecta
// ausencia de `index.html` y no registra rutas (Vite sirve aparte).
//
//go:embed all:frontend_dist
var frontendFS embed.FS

// mountFrontend sirve los assets estáticos compilados de Vite y aplica el
// fallback de SPA (toda ruta no-/api que no coincida con archivo va a
// index.html, para que React Router resuelva client-side).
//
// Si no hay frontend embebido (dev sin build), es no-op.
func mountFrontend(r *gin.Engine) {
	sub, err := fs.Sub(frontendFS, "frontend_dist")
	if err != nil {
		return
	}
	// Si index.html no existe, no hay frontend embebido — dev mode.
	if _, err := fs.Stat(sub, "index.html"); err != nil {
		return
	}
	fsys := http.FS(sub)

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		// No interceptar rutas /api/*.
		if strings.HasPrefix(path, "/api") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		if path == "/" {
			path = "/index.html"
		}
		// Intentar servir el archivo estático tal cual.
		f, err := fsys.Open(strings.TrimPrefix(path, "/"))
		if err != nil {
			// SPA fallback: devolver index.html para que React Router resuelva.
			f, err = fsys.Open("index.html")
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "frontend no embebido"})
				return
			}
		}
		defer f.Close()
		stat, err := f.Stat()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		rs, ok := f.(io.ReadSeeker)
		if !ok {
			// http.ServeContent requiere ReadSeeker; si el FS no lo soporta,
			// streameamos con io.Copy y seteamos Content-Type manualmente.
			c.Header("Content-Type", contentTypeFor(path))
			if _, err := io.Copy(c.Writer, f); err != nil {
				return
			}
			return
		}
		http.ServeContent(c.Writer, c.Request, stat.Name(), stat.ModTime(), rs)
	})
}

// contentTypeFor devuelve un Content-Type básico según extensión.
// http.ServeContent normalmente lo deduce solo; este fallback se usa solo
// cuando el FS no soporta ReadSeeker.
func contentTypeFor(path string) string {
	switch {
	case strings.HasSuffix(path, ".html"):
		return "text/html; charset=utf-8"
	case strings.HasSuffix(path, ".js"):
		return "application/javascript"
	case strings.HasSuffix(path, ".css"):
		return "text/css; charset=utf-8"
	case strings.HasSuffix(path, ".json"):
		return "application/json"
	case strings.HasSuffix(path, ".svg"):
		return "image/svg+xml"
	case strings.HasSuffix(path, ".png"):
		return "image/png"
	default:
		return "application/octet-stream"
	}
}
