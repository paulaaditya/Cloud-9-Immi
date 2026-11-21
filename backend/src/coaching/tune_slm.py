from typing import Any, Dict


def get_qlora_training_config() -> Dict[str, Any]:
    """Return hyperparameter dictionary tuned strictly for 8GB VRAM consumer GPUs."""
    return {
        "target_model": "Qwen/Qwen2.5-3B-Instruct",
        "load_in_4bit": True,
        "bnb_4bit_quant_type": "nf4",
        "bnb_4bit_compute_dtype": "bfloat16",
        "bnb_4bit_use_double_quant": True,
        "r": 16,
        "lora_alpha": 32,
        "lora_dropout": 0.05,
        "target_modules": [
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
        "per_device_train_batch_size": 2,
        "gradient_accumulation_steps": 4,
        "learning_rate": 2e-4,
        "max_seq_length": 2048,
        "gradient_checkpointing": True,
        "optim": "paged_adamw_8bit",
        "fp16": False,
        "bf16": True,
    }
