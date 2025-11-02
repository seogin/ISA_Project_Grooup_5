# server3/model_loader.py
"""Utilities for downloading and loading the coqui/XTTS-v2 model."""
from __future__ import annotations

import json
import os
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, List

from huggingface_hub import snapshot_download
from TTS.api import TTS


@dataclass
class XTTSArtifacts:
    """Resolved artifact locations for XTTS-v2."""
    model_dir: Path                 # directory that contains model.pth & config.json
    model_path: Optional[Path]      # .../model.pth (for validation only)
    config_path: Optional[Path]     # .../config.json
    language_ids_file: Optional[Path]


class XTTSModelLoader:
    """Lazy singleton loader that instantiates a single TTS() for XTTS-v2."""

    def __init__(self) -> None:
        self.repo_id = os.getenv("XTTS_REPO_ID", "coqui/XTTS-v2")
        default_dir = Path(__file__).resolve().parent / "models" / "coqui_xtts_v2"
        self.model_dir = Path(os.getenv("XTTS_MODEL_DIR", default_dir)).resolve()
        self.model_dir.mkdir(parents=True, exist_ok=True)

        self.use_gpu = os.getenv("XTTS_USE_GPU", "false").lower() in {"1", "true", "yes"}
        self._tts: Optional[TTS] = None
        self._languages: Optional[Dict[str, str]] = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    def get_tts(self) -> TTS:
        if self._tts is None:
            with self._lock:
                if self._tts is None:
                    arts = self._prepare_model()

                    # ✅ Allowlist Coqui XTTS classes for PyTorch 2.6 safe deserialization
                    try:
                        from torch.serialization import add_safe_globals
                        from TTS.tts.configs.xtts_config import XttsConfig
                        from TTS.tts.models.xtts import XttsAudioConfig
                        from TTS.config.shared_configs import BaseDatasetConfig
                        add_safe_globals([XttsConfig, XttsAudioConfig, BaseDatasetConfig])
                    except Exception:
                        pass  # ok on older torch

                    # XTTS on TTS==0.22.0: directory + explicit config.json
                    self._tts = TTS(
                        model_path=str(arts.model_dir),
                        config_path=str(arts.config_path),
                        progress_bar=False,
                        gpu=self.use_gpu,
                    )
        return self._tts


    # ------------------------------------------------------------------
    def get_supported_languages(self) -> Dict[str, str]:
        """Return language ID -> human label mapping (best effort)."""
        if self._languages is None:
            with self._lock:
                if self._languages is None:
                    arts = self._prepare_model()
                    langs: Dict[str, str] = {}
                    if arts.language_ids_file and arts.language_ids_file.exists():
                        try:
                            with arts.language_ids_file.open("r", encoding="utf-8") as f:
                                data = json.load(f)
                            if isinstance(data, dict):
                                langs = {v: k for k, v in data.items()}  # invert {label: token}
                            else:
                                langs = {
                                    e.get("id", ""): e.get("name", e.get("id", ""))
                                    for e in data
                                }
                                langs = {k: v for k, v in langs.items() if k}
                        except Exception:
                            langs = {}
                    if not langs:
                        langs = {
                            "en": "English", "es": "Spanish", "fr": "French",
                            "de": "German", "it": "Italian", "pt": "Portuguese",
                            "pl": "Polish", "tr": "Turkish", "ru": "Russian",
                            "zh-cn": "Chinese (Simplified)", "ja": "Japanese",
                            "ko": "Korean", "ar": "Arabic",
                        }
                    self._languages = langs
        return self._languages

    # ------------------------------------------------------------------
    def _prepare_model(self) -> XTTSArtifacts:
        """Ensure the XTTS model directory has required files."""
        arts = self._locate_artifacts()

        # If empty/missing, fetch snapshot
        if (arts.model_path is None or arts.config_path is None) and not any(self.model_dir.glob("*")):
            snapshot_download(
                repo_id=self.repo_id,
                local_dir=str(self.model_dir),
                local_dir_use_symlinks=False,
                allow_patterns=("*.json", "*.pth", "*.pt", "*.wav", "*.txt"),
            )
            arts = self._locate_artifacts()

        missing = []
        if arts.model_path is None or not arts.model_path.exists():
            missing.append("model.pth")
        if arts.config_path is None or not arts.config_path.exists():
            missing.append("config.json")
        if missing:
            raise FileNotFoundError(f"Missing XTTS files ({', '.join(missing)}) in {self.model_dir}")

        return arts

    # ------------------------------------------------------------------
    def _locate_artifacts(self) -> XTTSArtifacts:
        """Find XTTS files in the local model dir."""
        model_path = self._find_first(["**/model.pth", "**/*xtts*.pth"])
        config_path = self._find_first(["**/config.json"])
        language_ids_file = self._find_first(["**/language_ids*.json", "**/language_ids*.txt"])

        return XTTSArtifacts(
            model_dir=self.model_dir,
            model_path=model_path if model_path else None,
            config_path=config_path if config_path else None,
            language_ids_file=language_ids_file,
        )

    # ------------------------------------------------------------------
    def _find_first(self, patterns: List[str]) -> Optional[Path]:
        for p in patterns:
            hit = next(self.model_dir.glob(p), None)
            if hit:
                return hit.resolve()
        for p in patterns:
            hit = next(self.model_dir.rglob(p), None)
            if hit:
                return hit.resolve()
        return None


# Global singleton used by FastAPI app
loader = XTTSModelLoader()
