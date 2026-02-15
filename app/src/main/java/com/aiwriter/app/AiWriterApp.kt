package com.aiwriter.app

import android.app.Application

class AiWriterApp : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: AiWriterApp
            private set
    }
}
