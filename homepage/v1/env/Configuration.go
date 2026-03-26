package env

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log"
	"os"
	"time"
)

const (
	FILE_MODE = os.FileMode(0770)
)

var (
	HTTP_TLS     *tls.Config                                   // http: TLS Configuration
	HTTP_ADDRESS = envString("HTTP_ADDRESS", "localhost:8080") // http: Address to Listen for Requests on
	TLS_ENABLED  = envString("TLS_ENABLED", "false") == "true" // http: Enable TLS?
	TLS_CERT     = envString("TLS_CERT", "tls_crt.pem")        // http: Path to TLS Certificate
	TLS_KEY      = envString("TLS_KEY", "tls_key.pem")         // http: Path to TLS Key
	TLS_CA       = envString("TLS_CA", "tls_ca.pem")           // http: Path to TLS CA Bundle
	VERSION      = fmt.Sprintf("%X", time.Now().Unix())
)

func init() {
	log.Println("[env] Using Version Hash:", VERSION)

	// Load and Parse TLS Configuration from Disk
	if TLS_ENABLED {
		cert, err := tls.LoadX509KeyPair(TLS_CERT, TLS_KEY)
		if err != nil {
			log.Fatalln("[env/tls] Cannot Load Keypair", err)
		}
		caBytes, err := os.ReadFile(TLS_CA)
		if err != nil {
			log.Fatalln("[env/tls] Cannot Read CA File", err)
		}
		caPool := x509.NewCertPool()
		if !caPool.AppendCertsFromPEM(caBytes) {
			log.Fatalln("[env/tls] Cannot Append Certificates")
		}
		HTTP_TLS = &tls.Config{
			Certificates: []tls.Certificate{cert},
			ClientCAs:    caPool,
			MinVersion:   tls.VersionTLS13,
			MaxVersion:   tls.VersionTLS13,
			CipherSuites: []uint16{
				tls.TLS_AES_128_GCM_SHA256,
				tls.TLS_AES_256_GCM_SHA384,
				tls.TLS_CHACHA20_POLY1305_SHA256,
			},
		}
	}
}

// Reads String from Environment
func envString(key, defaultValue string) string {
	systemValue := os.Getenv(key)
	if systemValue == "" {
		if defaultValue == "\x00" {
			fmt.Printf("[env] Environment Variable '%s' is undefined\n", key)
			os.Exit(2)
		}
		return defaultValue
	}
	return systemValue
}
