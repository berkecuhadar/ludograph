# Unity loader

Sample code for reading a project exported with **File > Export Unity JSON**.

1. Copy `LudographData.cs` and `LudographGraphAsset.cs` into your Unity project.
2. In the editor: Assets > Create > Ludograph > Graph Asset.
3. Drag the exported `*.unity.json` file onto the asset's `Json` field.

```csharp
var asset = Resources.Load<LudographGraphAsset>("LudographGraph");
foreach (var node in asset.NodesInLayer(0))   // the core mechanic
    Debug.Log($"{node.kind}: {node.title}");
```

Notes on the data:

- Unity's `JsonUtility` has no null, so a missing layer is `-1` and missing text is `""`.
- Parameter values are text with a `valueType` (`string`, `number` or `boolean`). Use `AsFloat()` / `AsBool()`.
- Ids are the same as in the Ludograph file, so you can refer to a node by id from code and keep it across exports.
- The JSON field `params` is called `@params` in C#, because `params` is a keyword.
