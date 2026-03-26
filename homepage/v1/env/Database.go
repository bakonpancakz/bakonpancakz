package env

import (
	_ "embed"
	"encoding/json"
	"log"
	"time"
)

type databaseRoot struct {
	Site     databaseSite      `json:"site"`
	Articles []databaseArticle `json:"articles"`
}

type databaseSite struct {
	Host        string `json:"host"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Locale      string `json:"locale"`
	Owner       string `json:"owner"`
	Color       string `json:"color"`
}

type databaseArticle struct {
	BaseTemplate  string    `json:"base_template"`
	BaseResources string    `json:"base_resources"`
	BaseBanner    string    `json:"base_banner"`
	Color         string    `json:"color"`
	Slug          string    `json:"slug"`
	Date          time.Time `json:"date"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	Author        string    `json:"author"`
	Tags          []string  `json:"tags"`
}

var (
	//go:embed database.json
	embedDatabase []byte
	Database      databaseRoot
)

func init() {
	if err := json.Unmarshal(embedDatabase, &Database); err != nil {
		log.Fatalln("[env/db] Parse Database Error:", err)
	}
}
