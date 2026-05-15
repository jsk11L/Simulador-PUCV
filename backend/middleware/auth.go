package middleware

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// NewAuthMiddleware retorna un middleware Gin que valida el JWT y extrae
// el usuario_id al contexto. La clave secreta se inyecta vía parámetro
// para evitar variables globales mutables.
func NewAuthMiddleware(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token de autorización requerido"})
			c.Abort()
			return
		}

		tokenString := ""
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Formato de token inválido. Use: Bearer <token>"})
			c.Abort()
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("método de firma inesperado: %v", token.Header["alg"])
			}
			return secret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido o expirado"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Claims inválidos"})
			c.Abort()
			return
		}

		// usuario_id puede venir como float64 (JSON number) o string
		var usuarioID string
		switch v := claims["usuario_id"].(type) {
		case string:
			usuarioID = v
		case float64:
			usuarioID = fmt.Sprintf("%.0f", v)
		default:
			c.JSON(http.StatusUnauthorized, gin.H{"error": "usuario_id no encontrado en el token"})
			c.Abort()
			return
		}

		c.Set("usuario_id", usuarioID)
		c.Next()
	}
}
