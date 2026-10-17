
package com.untitled

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

import java.io.File
import java.io.FileOutputStream
import java.nio.FloatBuffer

import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

class YoloModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "YoloModule"

    private val inputSize = 640
    private val confidenceThreshold = 0.15f

    private data class Detection(
        val left: Float,
        val top: Float,
        val right: Float,
        val bottom: Float,
        val confidence: Float,
        val source: String
    ) {
        val width: Float get() = right - left
        val height: Float get() = bottom - top
        val area: Float get() = width * height
        val centerX: Float get() = (left + right) / 2f
        val centerY: Float get() = (top + bottom) / 2f
    }

    private data class Region(
        val left: Int,
        val top: Int,
        val right: Int,
        val bottom: Int,
        val name: String
    )

    private data class Frame(
        val left: Float,
        val top: Float,
        val right: Float,
        val bottom: Float
    )

    @ReactMethod
    fun detectIngredients(
        imagePath: String,
        previewWidth: Double,
        previewHeight: Double,
        promise: Promise
    ) {
        var original: Bitmap? = null

        try {
            val cleanPath = imagePath.removePrefix("file://")

            original = BitmapFactory.decodeFile(cleanPath)
                ?: throw IllegalArgumentException(
                    "Nie można odczytać zdjęcia"
                )

            val imageWidth = original.width
            val imageHeight = original.height

            if (previewWidth <= 0.0 || previewHeight <= 0.0) {
                throw IllegalArgumentException(
                    "Nieprawidłowy rozmiar podglądu"
                )
            }

            val frame = calculateFrame(
                imageWidth,
                imageHeight,
                previewWidth.toFloat(),
                previewHeight.toFloat()
            )

            val environment = OrtEnvironment.getEnvironment()

            val modelBytes = reactApplicationContext.assets
                .open("best.onnx")
                .use { it.readBytes() }

            environment.createSession(
                modelBytes,
                OrtSession.SessionOptions()
            ).use { session ->

                val detections = mutableListOf<Detection>()

                for (region in createRegions(imageWidth, imageHeight)) {
                    detections.addAll(
                        detectInRegion(
                            original,
                            region,
                            environment,
                            session
                        )
                    )
                }

                if (detections.isEmpty()) {
                    promise.reject(
                        "NO_DETECTION",
                        "Nie wykryto składu INCI"
                    )
                    return
                }


             val insideFrame = detections.filter { detection ->
                 detection.left >= frame.left &&
                     detection.top >= frame.top &&
                     detection.right <= frame.right &&
                     detection.bottom <= frame.bottom
             }

                if (insideFrame.isEmpty()) {
                    promise.reject(
                        "OUTSIDE_FRAME",
                        "Skład znajduje się poza ramką"
                    )
                    return
                }

                val best = selectBestDetection(insideFrame)

                val marginX = best.width * 0.015f
                val marginY = best.height * 0.02f

                val cropLeft = (best.left - marginX)
                    .roundToInt()
                    .coerceIn(0, imageWidth - 1)

                val cropTop = (best.top - marginY)
                    .roundToInt()
                    .coerceIn(0, imageHeight - 1)

                val cropRight = (best.right + marginX)
                    .roundToInt()
                    .coerceIn(cropLeft + 1, imageWidth)

                val cropBottom = (best.bottom + marginY)
                    .roundToInt()
                    .coerceIn(cropTop + 1, imageHeight)

                val cropWidth = cropRight - cropLeft
                val cropHeight = cropBottom - cropTop

                val cropped = Bitmap.createBitmap(
                    original,
                    cropLeft,
                    cropTop,
                    cropWidth,
                    cropHeight
                ).copy(Bitmap.Config.ARGB_8888, false)

                val cropFile = File(
                    reactApplicationContext.cacheDir,
                    "inci_crop_${System.currentTimeMillis()}.jpg"
                )

                try {
                    FileOutputStream(cropFile).use { stream ->
                        if (!cropped.compress(
                                Bitmap.CompressFormat.JPEG,
                                100,
                                stream
                            )
                        ) {
                            throw IllegalStateException(
                                "Nie udało się zapisać cropa"
                            )
                        }
                    }
                } finally {
                    cropped.recycle()
                }

                val response = Arguments.createMap()

                response.putString("cropPath", cropFile.absolutePath)
                response.putString("detectionSource", best.source)
                response.putDouble(
                    "confidence",
                    best.confidence.toDouble()
                )

                response.putInt("left", cropLeft)
                response.putInt("top", cropTop)
                response.putInt("right", cropRight)
                response.putInt("bottom", cropBottom)

                response.putInt("imageWidth", imageWidth)
                response.putInt("imageHeight", imageHeight)
                response.putInt("cropWidth", cropWidth)
                response.putInt("cropHeight", cropHeight)

                response.putInt("detectionsFound", detections.size)
                response.putInt("detectionsInsideFrame", insideFrame.size)

                promise.resolve(response)
            }

        } catch (e: Exception) {
            promise.reject(
                "YOLO_ERROR",
                "Błąd detekcji: ${e.message}",
                e
            )
        } finally {
            original?.recycle()
        }
    }

    private fun calculateFrame(
        imageWidth: Int,
        imageHeight: Int,
        previewWidth: Float,
        previewHeight: Float
    ): Frame {

        val scale = max(
            previewWidth / imageWidth,
            previewHeight / imageHeight
        )

        val displayedWidth = imageWidth * scale
        val displayedHeight = imageHeight * scale

        val offsetX = (displayedWidth - previewWidth) / 2f
        val offsetY = (displayedHeight - previewHeight) / 2f

        return Frame(
            left = (previewWidth * 0.10f + offsetX) / scale,
            top = (previewHeight * 0.30f + offsetY) / scale,
            right = (previewWidth * 0.90f + offsetX) / scale,
            bottom = (previewHeight * 0.70f + offsetY) / scale
        )
    }

    private fun createRegions(
        width: Int,
        height: Int
    ): List<Region> {
        val tileWidth = max(
            1,
            (width * 0.65f).roundToInt()
        ).coerceAtMost(width)

        val tileHeight = max(
            1,
            (height * 0.65f).roundToInt()
        ).coerceAtMost(height)

        val rightStart = width - tileWidth
        val bottomStart = height - tileHeight

        return listOf(
            Region(0, 0, width, height, "full"),
            Region(0, 0, tileWidth, tileHeight, "top_left"),
            Region(rightStart, 0, width, tileHeight, "top_right"),
            Region(0, bottomStart, tileWidth, height, "bottom_left"),
            Region(rightStart, bottomStart, width, height, "bottom_right")
        )
    }

  private fun selectBestDetection(
      detections: List<Detection>
  ): Detection {

      val highestConfidence = detections.maxOf {
          it.confidence
      }

      val candidates = detections.filter {
          it.confidence >= highestConfidence - 0.15f
      }

      return candidates.maxWithOrNull(
          compareBy<Detection> { it.area }
              .thenBy { it.confidence }
      ) ?: detections.first()
  }

    private fun detectInRegion(
        original: Bitmap,
        region: Region,
        environment: OrtEnvironment,
        session: OrtSession
    ): List<Detection> {

        val regionWidth = region.right - region.left
        val regionHeight = region.bottom - region.top

        val regionBitmap = Bitmap.createBitmap(
            original,
            region.left,
            region.top,
            regionWidth,
            regionHeight
        ).copy(Bitmap.Config.ARGB_8888, false)

        try {
            val scale = min(
                inputSize.toFloat() / regionWidth,
                inputSize.toFloat() / regionHeight
            )

            val resizedWidth =
                (regionWidth * scale).roundToInt()

            val resizedHeight =
                (regionHeight * scale).roundToInt()

            val resizedBitmap = Bitmap.createScaledBitmap(
                regionBitmap,
                resizedWidth,
                resizedHeight,
                true
            ).copy(Bitmap.Config.ARGB_8888, false)

            try {
                val letterbox = Bitmap.createBitmap(
                    inputSize,
                    inputSize,
                    Bitmap.Config.ARGB_8888
                )

                try {
                    val canvas = Canvas(letterbox)
                    canvas.drawColor(Color.rgb(114, 114, 114))

                    val padX = (inputSize - resizedWidth) / 2f
                    val padY = (inputSize - resizedHeight) / 2f

                    canvas.drawBitmap(
                        resizedBitmap,
                        padX,
                        padY,
                        Paint(Paint.FILTER_BITMAP_FLAG)
                    )

                    val pixels = IntArray(inputSize * inputSize)

                    letterbox.getPixels(
                        pixels,
                        0,
                        inputSize,
                        0,
                        0,
                        inputSize,
                        inputSize
                    )

                    val channelSize = inputSize * inputSize
                    val inputData = FloatArray(3 * channelSize)

                    for (i in pixels.indices) {
                        val pixel = pixels[i]

                        inputData[i] =
                            ((pixel shr 16) and 0xFF) / 255f

                        inputData[channelSize + i] =
                            ((pixel shr 8) and 0xFF) / 255f

                        inputData[2 * channelSize + i] =
                            (pixel and 0xFF) / 255f
                    }

                    OnnxTensor.createTensor(
                        environment,
                        FloatBuffer.wrap(inputData),
                        longArrayOf(1, 3, 640, 640)
                    ).use { tensor ->

                        session.run(
                            mapOf("images" to tensor)
                        ).use { result ->

                            @Suppress("UNCHECKED_CAST")
                            val output = result[0].value
                                as Array<Array<FloatArray>>

                            val predictions = output[0]

                            val detections = mutableListOf<Detection>()

                            for (i in predictions[4].indices) {
                                val confidence = predictions[4][i]

                                if (confidence < confidenceThreshold) {
                                    continue
                                }

                                val x = predictions[0][i]
                                val y = predictions[1][i]
                                val w = predictions[2][i]
                                val h = predictions[3][i]

                                val left = (
                                    (x - w / 2f - padX) / scale +
                                        region.left
                                    ).coerceIn(
                                        0f,
                                        original.width.toFloat()
                                    )

                                val top = (
                                    (y - h / 2f - padY) / scale +
                                        region.top
                                    ).coerceIn(
                                        0f,
                                        original.height.toFloat()
                                    )

                                val right = (
                                    (x + w / 2f - padX) / scale +
                                        region.left
                                    ).coerceIn(
                                        0f,
                                        original.width.toFloat()
                                    )

                                val bottom = (
                                    (y + h / 2f - padY) / scale +
                                        region.top
                                    ).coerceIn(
                                        0f,
                                        original.height.toFloat()
                                    )

                                if (right <= left || bottom <= top) {
                                    continue
                                }

                                // Wykrycia z fragmentów obrazu mogą być ucięte.
                                // Sprawdzamy, czy ramka YOLO dotyka wewnętrznej
                                // krawędzi fragmentu, poza którą istnieje dalsza część zdjęcia.

                                if (region.name != "full") {
                                    val tolerance = 5f

                                    val touchesLeft =
                                        region.left > 0 &&
                                        left <= region.left + tolerance

                                    val touchesTop =
                                        region.top > 0 &&
                                        top <= region.top + tolerance

                                    val touchesRight =
                                        region.right < original.width &&
                                        right >= region.right - tolerance

                                    val touchesBottom =
                                        region.bottom < original.height &&
                                        bottom >= region.bottom - tolerance

                                    if (
                                        touchesLeft ||
                                        touchesTop ||
                                        touchesRight ||
                                        touchesBottom
                                    ) {
                                        continue
                                    }
                                }

                                detections.add(
                                    Detection(
                                        left,
                                        top,
                                        right,
                                        bottom,
                                        confidence,
                                        region.name
                                    )
                                )
                            }


                            return detections
                                .sortedByDescending {
                                    it.confidence
                                }
                                .take(30)
                        }
                    }

                } finally {
                    letterbox.recycle()
                }

            } finally {
                resizedBitmap.recycle()
            }

        } finally {
            regionBitmap.recycle()
        }
    }
}
