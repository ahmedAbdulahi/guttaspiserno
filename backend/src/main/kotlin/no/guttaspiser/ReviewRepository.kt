package no.guttaspiser

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

interface ReviewRepository {
    suspend fun list(): List<Review>
    suspend fun save(request: ReviewRequest): Review
    /** Returnerer false hvis reviewen ikke fantes. */
    suspend fun delete(id: Long): Boolean
}

@Serializable
private data class InsertReviewParams(
    val p_sted: String,
    val p_navn: String,
    val p_kommentar: String?,
    val p_rank: Int,
)

@Serializable
private data class DeleteReviewParams(val p_id: Long)

/**
 * Snakker med Supabase via PostgREST (`/rest/v1`). Innsetting og sletting går via
 * SQL-funksjonene i `supabase_002_ranking.sql`, slik at rangeringen oppdateres atomisk.
 */
class SupabaseReviewRepository(
    private val supabaseUrl: String,
    private val supabaseKey: String,
    engine: HttpClientEngine = CIO.create(),
) : ReviewRepository {

    private val client = HttpClient(engine) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        defaultRequest {
            // Nye Supabase-nøkler (sb_secret_...) sendes kun i apikey-headeren, ikke som Bearer-token
            header("apikey", supabaseKey)
        }
    }

    override suspend fun list(): List<Review> =
        client.get("$supabaseUrl/rest/v1/reviews") {
            parameter("select", "*")
            parameter("order", "navn.asc,rank.asc")
        }.orThrow().body()

    override suspend fun save(request: ReviewRequest): Review =
        client.post("$supabaseUrl/rest/v1/rpc/insert_review") {
            contentType(ContentType.Application.Json)
            setBody(InsertReviewParams(request.sted, request.navn, request.kommentar, request.rank))
        }.orThrow().body()

    override suspend fun delete(id: Long): Boolean =
        client.post("$supabaseUrl/rest/v1/rpc/delete_review") {
            contentType(ContentType.Application.Json)
            setBody(DeleteReviewParams(id))
        }.orThrow().body()

    private suspend fun HttpResponse.orThrow(): HttpResponse {
        if (!status.isSuccess()) error("Supabase svarte $status: ${bodyAsText()}")
        return this
    }
}
