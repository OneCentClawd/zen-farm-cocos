# 幸运草素材 (Clover Assets)

由 HuggingFace FLUX.1 生成，透明背景 PNG

## 素材清单

| 文件 | 用途 | 阶段 |
|-----|------|-----|
| `clover_sprout.png` | 发芽小苗 | 发芽期 |
| `clover_stem.png` | 茎秆 | 通用 |
| `clover_3leaf.png` | 小叶子 | 幼苗期 |
| `clover_complete.png` | 完整四叶草 | 生长/成熟期 |
| `clover_leaf.png` | 多角度叶子 | 备用 |

## 使用方式

在 Cocos Creator 中：
1. 将素材拖入 `PlantSpriteRenderer` 组件的对应属性
2. 或使用 `resources.load()` 动态加载

## 生成命令

```bash
curl -X POST "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell" \
  -H "Authorization: Bearer $HF_TOKEN" \
  -d '{"inputs": "..."}'
```
