using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Ludograph
{
    // Holds an exported Ludograph project as a ScriptableObject.
    // Create one from the Assets menu, drop the exported .unity.json file on
    // the "Json" field, and read the data through the helpers below.
    [CreateAssetMenu(menuName = "Ludograph/Graph Asset", fileName = "LudographGraph")]
    public class LudographGraphAsset : ScriptableObject
    {
        public TextAsset json;

        [SerializeField] LudographData data;
        Dictionary<string, LudographNode> nodesById;

        public LudographData Data => data;

        // Runs in the editor whenever the asset changes, so the data stays in step with the file.
        void OnValidate() => Reload();

        public void Reload()
        {
            nodesById = null;
            if (json == null) return;
            data = JsonUtility.FromJson<LudographData>(json.text);
        }

        public LudographNode GetNode(string id)
        {
            if (data?.nodes == null) return null;
            nodesById ??= data.nodes.ToDictionary(n => n.id);
            return nodesById.TryGetValue(id, out var node) ? node : null;
        }

        // layer: 0 core, 1 secondary, 2 progression, 3 narrative
        public IEnumerable<LudographNode> NodesInLayer(int layer) =>
            data?.nodes?.Where(n => n.layer == layer) ?? Enumerable.Empty<LudographNode>();

        // For a prototype that only builds the core: skip anything marked "skip", stub the rest as you like.
        public IEnumerable<LudographNode> NodesToBuild() =>
            data?.nodes?.Where(n => n.prototypeScope != "skip") ?? Enumerable.Empty<LudographNode>();

        public IEnumerable<LudographEdge> EdgesFrom(string nodeId, string kind = null) =>
            data?.edges?.Where(e => e.source == nodeId && (kind == null || e.kind == kind))
            ?? Enumerable.Empty<LudographEdge>();

        public IEnumerable<LudographEdge> EdgesTo(string nodeId, string kind = null) =>
            data?.edges?.Where(e => e.target == nodeId && (kind == null || e.kind == kind))
            ?? Enumerable.Empty<LudographEdge>();

        // Example: the states that follow a state in the round cycle.
        public IEnumerable<LudographNode> Next(string nodeId) =>
            EdgesFrom(nodeId, "triggers").Select(e => GetNode(e.target)).Where(n => n != null);
    }
}
