package include

import (
	"embed"
	"io"
	"io/fs"
	"log"
	"os"
	"path"
	"strings"
)

var (
	//go:embed public/*
	embedPublic embed.FS
	//go:embed templates/*
	embedTemplates embed.FS

	Embedded  = true
	Templates fs.FS
	Public    fs.FS
)

func init() {
	if strings.Contains(os.Args[0], "go-build") {
		Embedded = false
	}
	if Embedded {
		Templates = embedTemplates
		Public = embedPublic
	} else {
		log.Println("[include] In Debug Mode, using local filesystem!")
		Templates = os.DirFS("include/templates")
		Public = os.DirFS("include/public")
	}
}

func PreparePath(fsys fs.FS, filepath string) string {
	filepath = path.Clean(filepath)
	if Embedded {
		// If using embed, prepend the folder name automatically if missing
		switch {
		case fsys == Public && !strings.HasPrefix(filepath, "public/"):
			filepath = path.Join("public", filepath)
		case fsys == Templates && !strings.HasPrefix(filepath, "templates/"):
			filepath = path.Join("templates", filepath)
		}
	}
	return filepath
}

func ReadFile(fsys fs.FS, filepath string) ([]byte, error) {
	f, err := fsys.Open(PreparePath(fsys, filepath))
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return io.ReadAll(f)
}
