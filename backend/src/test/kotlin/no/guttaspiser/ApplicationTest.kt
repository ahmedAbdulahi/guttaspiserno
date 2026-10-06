package no.guttaspiser

import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.toByteArray
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.http.headersOf
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ApplicationTest {

    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    @Test
    fun `lagrer review via insert_review i supabase`() {
        var sentBody = ""
        var sentUrl = ""
        val engine = MockEngine { req ->
            sentUrl = req.url.toString()
            sentBody = String(req.body.toByteArray())
            respond(
                """{"id":1,"sted":"Peppes","navn":"Ahmed","kommentar":"bra","rank":2,"created_at":"2026-10-06T12:00:00Z"}""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        testApplication {
            application { module(SupabaseReviewRepository("https://x.supabase.co", "key", engine)) }
            val res = client.post("/api/reviews") {
                contentType(ContentType.Application.Json)
                setBody("""{"sted":"Peppes","navn":"Ahmed","kommentar":"bra","rank":2}""")
            }
            assertEquals(HttpStatusCode.Created, res.status)
            assertEquals("https://x.supabase.co/rest/v1/rpc/insert_review", sentUrl)
            assertTrue(sentBody.contains("\"p_rank\":2"))
        }
    }

    @Test
    fun `henter alle reviews`() {
        val engine = MockEngine {
            respond(
                """[{"id":1,"sted":"Peppes","navn":"Ahmed","kommentar":null,"rank":0,"created_at":"2026-10-06T12:00:00Z"}]""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        testApplication {
            application { module(SupabaseReviewRepository("https://x.supabase.co", "key", engine)) }
            val res = client.get("/api/reviews")
            assertEquals(HttpStatusCode.OK, res.status)
            assertTrue(res.bodyAsText().contains("Peppes"))
        }
    }

    @Test
    fun `sletting gir 404 hvis review ikke finnes`() {
        val engine = MockEngine { respond("false", HttpStatusCode.OK, jsonHeaders) }
        testApplication {
            application { module(SupabaseReviewRepository("https://x.supabase.co", "key", engine)) }
            assertEquals(HttpStatusCode.NotFound, client.delete("/api/reviews/42").status)
        }
    }

    @Test
    fun `avviser negativ rank`() {
        val repo = object : ReviewRepository {
            override suspend fun list() = emptyList<Review>()
            override suspend fun save(request: ReviewRequest) = error("skal ikke kalles")
            override suspend fun delete(id: Long) = false
        }
        testApplication {
            application { module(repo) }
            val res = client.post("/api/reviews") {
                contentType(ContentType.Application.Json)
                setBody("""{"sted":"Peppes","navn":"Ahmed","rank":-1}""")
            }
            assertEquals(HttpStatusCode.BadRequest, res.status)
        }
    }
}
