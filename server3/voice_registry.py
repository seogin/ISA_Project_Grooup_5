"""Simple JSON-backed registry for XTTS reference voices."""
from __future__ import annotations

import json
import os
import shutil
import uuid
from pathlib import Path
from typing import Dict, List, Optional


class VoiceRegistry:
    def __init__(self, storage_dir: Path, default_voice: Optional[Path] = None) -> None:
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.registry_file = self.storage_dir / "voices.json"
        self._voices: Dict[str, Dict[str, str]] = {}
        self._load()

        if default_voice:
            self.ensure_default_voice(default_voice)

    # ------------------------------------------------------------------
    def _load(self) -> None:
        if self.registry_file.exists():
            with self.registry_file.open("r", encoding="utf-8") as handle:
                try:
                    data = json.load(handle)
                except json.JSONDecodeError:
                    data = {}
            if isinstance(data, dict):
                self._voices = data

    # ------------------------------------------------------------------
    def _save(self) -> None:
        with self.registry_file.open("w", encoding="utf-8") as handle:
            json.dump(self._voices, handle, indent=2, ensure_ascii=False)

    # ------------------------------------------------------------------
    def ensure_default_voice(self, voice_path: Path) -> None:
        voice_path = voice_path.expanduser().resolve()
        if not voice_path.exists():
            return
        default_id = "default"
        metadata = self._voices.get(default_id)
        if metadata and Path(metadata["file_path"]).exists():
            return

        target = self._copy_voice_file(voice_path, default_id)
        self._voices[default_id] = {
            "voice_id": default_id,
            "display_name": "Default voice",
            "language": os.getenv("XTTS_DEFAULT_LANGUAGE", "en"),
            "file_path": str(target),
        }
        self._save()

    # ------------------------------------------------------------------
    def list_voices(self) -> List[Dict[str, str]]:
        """Return public metadata about the registered voices."""

        return [
            {
                "voice_id": meta.get("voice_id"),
                "display_name": meta.get("display_name"),
                "language": meta.get("language"),
            }
            for meta in self._voices.values()
        ]

    # ------------------------------------------------------------------
    def get_voice_path(self, voice_id: str) -> Optional[Path]:
        metadata = self._voices.get(voice_id)
        if not metadata:
            return None
        candidate = Path(metadata["file_path"])
        return candidate if candidate.exists() else None

    # ------------------------------------------------------------------
    def register_voice(
        self,
        source_path: Path,
        display_name: Optional[str] = None,
        language: Optional[str] = None,
    ) -> Dict[str, str]:
        voice_id = uuid.uuid4().hex
        target = self._copy_voice_file(source_path, voice_id)
        metadata = {
            "voice_id": voice_id,
            "display_name": display_name or f"Voice {voice_id[:8]}",
            "language": language or "en",
            "file_path": str(target),
        }
        self._voices[voice_id] = metadata
        self._save()
        return metadata

    # ------------------------------------------------------------------
    def _copy_voice_file(self, source_path: Path, voice_id: str) -> Path:
        source_path = source_path.expanduser().resolve()
        if not source_path.exists():
            raise FileNotFoundError(f"Voice sample not found: {source_path}")
        extension = source_path.suffix or ".wav"
        target = self.storage_dir / f"{voice_id}{extension}"
        shutil.copyfile(source_path, target)
        return target


__all__ = ["VoiceRegistry"]
