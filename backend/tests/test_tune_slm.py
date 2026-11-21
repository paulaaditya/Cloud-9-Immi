from src.coaching.tune_slm import get_qlora_training_config


def test_qlora_training_config_fits_8gb_vram():
    config = get_qlora_training_config()
    assert config["target_model"] == "Qwen/Qwen2.5-3B-Instruct"
    assert config["load_in_4bit"] is True
    assert config["r"] <= 16
    assert config["lora_alpha"] <= 32
    assert config["per_device_train_batch_size"] <= 2
    assert config["gradient_checkpointing"] is True
    assert config["bnb_4bit_compute_dtype"] in ["bfloat16", "float16"]
