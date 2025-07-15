import os
from pathlib import Path
from typing import Any, Dict, Optional

import yaml

from .config import AppConfig


class ConfigLoader:
    """配置加载器，支持多种配置源"""

    def __init__(self, config_dir: Optional[Path] = None):
        self.config_dir = config_dir or Path(__file__).parent
        self._config_cache: Optional[AppConfig] = None

    def load_from_env(self) -> Dict[str, Any]:
        """从环境变量加载配置"""
        config: dict = {}
        env_prefix = "XYZEN_"

        for key, value in os.environ.items():
            if key.startswith(env_prefix):
                # 转换环境变量名为嵌套字典
                # XYZEN_MCP_DEBUG -> {"mcp": {"debug": True}}
                config_key = key[len(env_prefix) :].lower()  # noqa: E203
                keys = config_key.split("_")

                current = config
                for k in keys[:-1]:
                    if k not in current:
                        current[k] = {}
                    current = current[k]

                # 类型转换
                if value.lower() in ("true", "false"):
                    current[keys[-1]] = value.lower() == "true"
                elif value.isdigit():
                    current[keys[-1]] = int(value)
                else:
                    current[keys[-1]] = value

        return config

    def load_from_file(self, filename: str) -> Dict[str, Any]:
        """从配置文件加载配置"""
        file_path = self.config_dir / filename

        if not file_path.exists():
            return {}

        with open(file_path, "r", encoding="utf-8") as f:
            if filename.endswith((".yml", ".yaml")):
                return yaml.safe_load(f) or {}
            else:
                return {}

    def merge_configs(self, *configs: Dict[str, Any]) -> Dict[str, Any]:
        """深度合并多个配置字典"""
        result: dict = {}

        for config in configs:
            self._deep_merge(result, config)

        return result

    def _deep_merge(self, target: Dict[str, Any], source: Dict[str, Any]) -> None:
        """递归深度合并字典"""
        for key, value in source.items():
            if key in target and isinstance(target[key], dict) and isinstance(value, dict):
                self._deep_merge(target[key], value)
            else:
                target[key] = value

    def load(self) -> AppConfig:
        """加载完整配置，优先级：环境变量 > 配置文件 > 默认值"""
        if self._config_cache is not None:
            return self._config_cache

        # 加载不同来源的配置
        env_config = self.load_from_env()

        # 根据环境加载不同的配置文件
        env = os.getenv("XYZEN_ENV", "dev")
        config_files = [
            "config.yaml",  # 基础配置
            f"config.{env}.yaml",  # 环境特定配置
            "config.local.yaml",  # 本地覆盖配置
        ]

        file_configs = [self.load_from_file(f) for f in config_files]

        # 合并所有配置，环境变量优先级最高
        merged_config = self.merge_configs(*file_configs, env_config)

        # 创建配置模型实例
        self._config_cache = AppConfig(**merged_config)
        return self._config_cache


config_loader = ConfigLoader()
configs = config_loader.load()

__all__ = ["configs"]
