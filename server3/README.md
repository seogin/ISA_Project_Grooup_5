# AI Speech Synthesis Service

This service exposes a RESTful API that performs text-to-speech synthesis by running the [`coqui/XTTS-v2`](https://huggingface.co/coqui/XTTS-v2) model entirely on the server.  It is designed to be deployed alongside the existing authentication and database services as a dedicated AI microservice.

The code uses [FastAPI](https://fastapi.tiangolo.com/) for the HTTP layer and the [Coqui TTS](https://tts.readthedocs.io/) runtime for inference.  The service automatically downloads the model weights to a folder that you control and serves audio responses as base64-encoded WAV payloads, making it easy for web or mobile clients to consume.

## Features

- 🔐 Stateless JSON API ready to sit behind your existing auth gateway
- 📦 Automatic model bootstrap with a configurable storage directory
- 🔁 Endpoint to list known voices and register new voice samples
- 🧠 Deterministic synthesis powered by the locally hosted `coqui/XTTS-v2` checkpoint
- 📂 Optional persistence of generated clips for auditing/debugging

## Project layout

```
server3/
├── README.md
├── requirements.txt
├── main.py
├── model_loader.py
├── voice_registry.py
└── samples/
```

Only the Python files are required for deployment.  The `samples/` folder is optional and can contain reference speaker clips that you want to preload.

## Quick start

1. **Create a Python environment**
   ```bash
   cd server3
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Download the XTTS model to your hosting account**

   The service will try to download the model the first time it boots. If your production environment blocks outbound traffic, you can pre-download it:

   ```bash
   huggingface-cli download coqui/XTTS-v2 --local-dir ./models/coqui_xtts_v2 --exclude "*.onnx" "*.tflite"
   then 
   export XTTS_MODEL_DIR="$(pwd)/models/coqui_xtts_v2"


   ```

   Afterwards, point the app to that folder by setting `XTTS_MODEL_DIR=$(pwd)/models/coqui_xtts_v2`.

3. **(Optional) Provide a default voice sample**

   XTTS requires a short reference clip (~3–5 seconds) to clone a speaker. Place the clip inside `samples/` (WAV, 16 kHz or 22.05 kHz). Update `.env` or the environment variable `XTTS_DEFAULT_VOICE` to the absolute path of that file.

   say "This is my reference voice." -o samples/voice.aiff
   ffmpeg -i samples/voice.aiff -ar 16000 -ac 1 samples/voice.wav
   export XTTS_DEFAULT_VOICE="$(pwd)/samples/voice.wav"


4. **Run the API**
   ```bash
   # from inside server3/
   uvicorn main:app --host 0.0.0.0 --port 8081

   # ...or from the project root
   uvicorn server3.main:app --host 0.0.0.0 --port 8081
   ```

5. **Call the synthesis endpoint**
   ```bash
   curl -X POST http://localhost:8081/api/v1/tts/synthesize \
        -H "Content-Type: application/json" \
        -d '{
              "text": "Hello from our AI server!",
              "language": "en",
              "speaker_id": "default"
            }'
   ```

   The response contains the generated audio as base64-encoded PCM data. Clients can decode the base64 string and play it back or save it to disk.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `XTTS_MODEL_DIR` | Directory containing the XTTS model files (`model.pth`, `config.json`, etc.). | `<repo>/server3/models/coqui_xtts_v2` |
| `XTTS_REPO_ID` | Hugging Face repo to download if `XTTS_MODEL_DIR` is empty. | `coqui/XTTS-v2` |
| `XTTS_DEFAULT_VOICE` | Absolute path to a WAV reference clip used when clients request the `default` voice. | `None` |
| `XTTS_STORE_DIR` | Directory where generated clips are written (when `store_generated_audio=true`). | `<repo>/server3/generated` |
| `XTTS_ALLOW_ORIGINS` | Comma-separated list of origins for CORS. | `*` |

## API surface

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Lightweight readiness probe used by orchestration. |
| `GET` | `/api/v1/tts/config` | Returns supported languages and synthesis defaults. |
| `GET` | `/api/v1/tts/voices` | Lists the registered voices (IDs plus metadata). |
| `POST` | `/api/v1/tts/voices` | Registers a new voice sample by uploading a WAV (base64 or URL). |
| `POST` | `/api/v1/tts/synthesize` | Generates speech for the supplied text and voice options. |

All request and response contracts live in `main.py` and are validated with Pydantic.

## Integration notes

- The service does **not** perform authentication itself.  Deploy it behind the existing Node.js gateway and forward the `userId` (or token claims) if you need to meter usage.
- `coqui/XTTS-v2` needs ~6 GB of RAM to run comfortably on CPU.  For production, provision a VM with at least 8 GB of RAM or attach a GPU and set `XTTS_USE_GPU=true`.
- Remember to hash filenames or store them outside the web root if you enable persistent storage to avoid leaking user-provided speech.

## Digital Ocean Deployment

When deploying to Digital Ocean App Platform, ensure you have a `runtime.txt` file in the `server3/` directory specifying Python 3.9-3.11:

```
python-3.11.9
```

The `TTS==0.22.0` package requires Python >=3.9.0 and <3.12. If your deployment shows version compatibility errors, verify that Digital Ocean is using Python 3.9, 3.10, or 3.11 (not 3.12 or higher).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ERROR: Ignored the following versions that require a different python version` | Ensure `runtime.txt` specifies Python 3.9, 3.10, or 3.11. TTS 0.22.0 does not support Python 3.12+. |
| `ModuleNotFoundError: TTS` | Ensure `pip install -r requirements.txt` ran in the active virtualenv. |
| `RuntimeError: "ninja" is required to load c++ extensions` | Install build tools (`sudo apt install build-essential ninja-build`). |
| `OSError: Tunnel connection failed` | Your environment blocks outbound HTTPS. Download the model manually and point `XTTS_MODEL_DIR` to the offline copy. |

Once this microservice is running, connect it to the rest of your system by calling the synthesis endpoint from your Node.js API after authenticating and authorising the request.
