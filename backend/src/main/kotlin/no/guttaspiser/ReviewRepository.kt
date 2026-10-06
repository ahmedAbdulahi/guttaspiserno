package no.guttaspiser

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

interface ReviewRepository {
    suspend fun save(request: ReviewRequest): Review
}

/** Lagrer reviews i Supabase via PostgREST-API-et (`/rest/v1/<tabell>`). */
class SupabaseReviewRepository(
    private val supabaseUrl: String,
    private val supabaseKey: String,
    engine: HttpClientEngine = CIO.create(),
    private val table: String = "reviews",
) : ReviewRepository {

    private val client = HttpClient(engine) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    override suspend fun save(request: ReviewRequest): Review {
        val payload = request.copy(
            sted = request.sted.trim(),
            navn = request.navn.trim(),
            kommentar = request.kommentar?.trim()?.ifEmpty { null },
        )
        val response = client.post("$supabaseUrl/rest/v1/$table") {
            // Nye Supabase-nøkler (sb_secret_...) sendes kun i apikey-headeren, ikke som Bearer-token
            header("apikey", supabaseKey)
            header("Prefer", "return=representation")
            contentType(ContentType.Application.Json)
            setBody(payload)
        }
        if (!response.status.isSuccess()) {
            error("Supabase svarte ${response.status}: ${response.bodyAsText()}")
        }
        return response.body<List<Review>>().single()
    }
}
