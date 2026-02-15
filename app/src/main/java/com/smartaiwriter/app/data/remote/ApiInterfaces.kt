package com.smartaiwriter.app.data.remote

import retrofit2.Response
import retrofit2.http.*

interface LongcatApi {
    @POST("chat/completions")
    suspend fun chatCompletion(
        @Header("Authorization") auth: String,
        @Body request: ChatRequest
    ): Response<ChatResponse>
}

interface PexelsApi {
    @GET("search")
    suspend fun searchPhotos(
        @Header("Authorization") apiKey: String,
        @Query("query") query: String,
        @Query("per_page") perPage: Int = 1,
        @Query("orientation") orientation: String = "landscape"
    ): Response<PexelsSearchResponse>
}
