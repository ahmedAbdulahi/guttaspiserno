package no.guttaspiser

import java.io.File

data class Config(
    val port: Int,
    val supabaseUrl: String,
    val supabaseKey: String,
    val allowedOrigins: List<String>,
) {
    companion object {
        /**
         * Leser config fra miljøvariabler. Finnes det en `.env`-fil i mappen backenden
         * startes fra, brukes verdiene derfra som fallback.
         */
        fun fromEnv(dotEnv: Map<String, String> = loadDotEnv(File(".env"))): Config {
            fun get(name: String): String? =
                System.getenv(name)?.takeIf { it.isNotBlank() } ?: dotEnv[name]?.takeIf { it.isNotBlank() }

            fun require(name: String): String =
                get(name) ?: error("Miljøvariabelen $name mangler (verken satt i miljøet eller i .env)")

            return Config(
                port = get("PORT")?.toInt() ?: 8080,
                supabaseUrl = require("SUPABASE_URL").trimEnd('/'),
                supabaseKey = require("SUPABASE_SECRET_KEY"),
                allowedOrigins = (get("ALLOWED_ORIGINS") ?: "http://localhost:8731")
                    .split(",").map { it.trim() }.filter { it.isNotEmpty() },
            )
        }

        fun loadDotEnv(file: File): Map<String, String> {
            if (!file.isFile) return emptyMap()
            return file.readLines()
                .map { it.trim() }
                .filter { it.isNotEmpty() && !it.startsWith("#") && it.contains("=") }
                .associate { line ->
                    val key = line.substringBefore("=").trim().removePrefix("export ").trim()
                    val value = line.substringAfter("=").trim().removeSurrounding("\"").removeSurrounding("'")
                    key to value
                }
        }
    }
}
