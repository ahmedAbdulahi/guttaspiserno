package no.guttaspiser

import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.toByteArray
import io.ktor.client.request.post
import io.ktor.client.request.setBody
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

    @Test
    fun `lagrer gyldig review i supabase`() {
        var sentBody = ""
        var sentUrl = ""
        val engine = MockEngine { req ->
            sentUrl = req.url.toString()
            sentBody = String(req.body.toByteArray())
            respond(
                """[{"id":1,"sted":"Peppes","navn":"Ahmed","stjerner":4,"kommentar":"bra","created_at":"2026-10-06T12:00:00Z"}]""",
                HttpStatusCode.Created,
                headersOf(HttpHeaders.ContentType, "application/json"),
            )
        }
        testApplication {
            application { module(SupabaseReviewRepository("https://x.supabase.co", "key", engine), listOf("http://localhost:8731")) }
            val res = client.post("/api/reviews") {
                contentType(ContentType.Application.Json)
                setBody("""{"sted":" Peppes ","navn":"Ahmed","stjerner":4,"kommentar":"bra"}""")
            }
            assertEquals(HttpStatusCode.Created, res.status)
            assertEquals("https://x.supabase.co/rest/v1/reviews", sentUrl)
            assertTrue(sentBody.contains("\"sted\":\"Peppes\""))
        }
    }

    @Test
    fun `avviser ugyldig antall stjerner`() {
        val repo = object : ReviewRepository {
            override suspend fun save(request: ReviewRequest) = error("skal ikke kalles")
        }
        testApplication {
            application { module(repo, emptyList()) }
            val res = client.post("/api/reviews") {
                contentType(ContentType.Application.Json)
                setBody("""{"sted":"Peppes","navn":"Ahmed","stjerner":7}""")
            }
            assertEquals(HttpStatusCode.BadRequest, res.status)
        }
    }
}
