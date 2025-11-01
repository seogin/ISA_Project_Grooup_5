"""Utilities for downloading and loading the coqui/XTTS-v2 model."""
from __future__ import annotations

import json
import os
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

from huggingface_hub import snapshot_download
from TTS.api import TTS


@dataclass
class XTTSArtifacts:
    """Paths to the files required by the XTTS synthesiser."""

    model_path: Optional[Path]
    config_path: Optional[Path]
    speakers_file: Optional[Path]
    language_ids_file: Optional[Path]


class XTTSModelLoader:
    """Lazy loader that keeps a single XTTS instance in memory."""

    def __init__(self) -> None:
        self.repo_id = os.getenv("XTTS_REPO_ID", "coqui/XTTS-v2")
        default_dir = Path(__file__).resolve().parent / "models" / "coqui_xtts_v2"
        self.model_dir = Path(os.getenv("XTTS_MODEL_DIR", default_dir))
        self.model_dir.mkdir(parents=True, exist_ok=True)

        self.use_gpu = os.getenv("XTTS_USE_GPU", "false").lower() in {"1", "true", "yes"}
        self._tts: Optional[TTS] = None
        self._languages: Optional[Dict[str, str]] = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    def get_tts(self) -> TTS:
        """Return a singleton TTS instance, downloading assets if needed."""

        if self._tts is None:
            with self._lock:
                if self._tts is None:
                    artifacts = self._prepare_model()
                    self._tts = TTS(
                        model_path=str(artifacts.model_path),
                        config_path=str(artifacts.config_path),
                        speakers_file=str(artifacts.speakers_file) if artifacts.speakers_file else None,
                        language_ids_file=str(artifacts.language_ids_file) if artifacts.language_ids_file else None,
                        use_cuda=self.use_gpu,
                    )
        return self._tts

    # ------------------------------------------------------------------
    def get_supported_languages(self) -> Dict[str, str]:
        """Return language ID to description mapping from the XTTS assets."""

        if self._languages is None:
            with self._lock:
                if self._languages is None:
                    artifacts = self._prepare_model()
                    if artifacts.language_ids_file and artifacts.language_ids_file.exists():
                        with artifacts.language_ids_file.open("r", encoding="utf-8") as handle:
                            data = json.load(handle)
                        # the file ships as mapping from readable name to token; we invert it for clarity
                        if isinstance(data, dict):
                            languages = {value: key for key, value in data.items()}
                        else:
                            languages = {entry["id"]: entry.get("name", entry["id"]) for entry in data}
                    else:
                        # fallback to a curated subset documented in Coqui's README
                        languages = {
                            "en": "English",
                            "es": "Spanish",
                            "fr": "French",
                            "de": "German",
                            "it": "Italian",
                            "pt": "Portuguese",
                            "pl": "Polish",
                            "tr": "Turkish",
                            "ru": "Russian",
                            "zh-cn": "Chinese (Simplified)",
                            "ja": "Japanese",
                            "ko": "Korean",
                            "ar": "Arabic",
                        }
                    self._languages = languages
        return self._languages

    # ------------------------------------------------------------------
    def _prepare_model(self) -> XTTSArtifacts:
        """Ensure that all required model files exist locally."""

        artifacts = self._locate_artifacts()
        if artifacts.model_path is None or artifacts.config_path is None:
            snapshot_download(
                repo_id=self.repo_id,
                local_dir=str(self.model_dir),
                local_dir_use_symlinks=False,
                allow_patterns=("*.json", "*.pth", "*.pt", "*.wav", "*.txt"),
            )
            artifacts = self._locate_artifacts()
        missing = [
            name
            for name, path in (
                ("model", artifacts.model_path),
                ("config", artifacts.config_path),
            )
            if path is None or not path.exists()
        ]
        if missing:
            raise FileNotFoundError(
                "Missing XTTS files: " + ", ".join(missing) + f" in {self.model_dir}"
            )
        return artifacts

    # ------------------------------------------------------------------
    def _locate_artifacts(self) -> XTTSArtifacts:
        """Find required XTTS files in the local model directory."""

        model_path = self._find_first(["**/model.pth", "**/*xtts*.pth", "**/*.pth"])
        config_path = self._find_first(["**/config.json"])
        speakers_file = self._find_first(["**/speakers*.json", "**/speakers*.pth"])
        language_ids_file = self._find_first(["**/language_ids*.json", "**/language_ids*.txt"])
        return XTTSArtifacts(
            model_path=model_path if model_path else None,
            config_path=config_path if config_path else None,
            speakers_file=speakers_file,
            language_ids_file=language_ids_file,
        )

    # ------------------------------------------------------------------
    def _find_first(self, patterns: list[str]) -> Optional[Path]:
        for pattern in patterns:
            match = next(self.model_dir.glob(pattern), None)
            if match:
                return match
        # If direct glob fails, search recursively using rglob
        for pattern in patterns:
            match = next(self.model_dir.rglob(pattern), None)
            if match:
                return match
        return None


loader = XTTSModelLoader()
"""Default global loader used by the FastAPI app."""
