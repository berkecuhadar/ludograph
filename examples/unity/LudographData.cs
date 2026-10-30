using System;
using System.Collections.Generic;

// Plain data classes that match the file written by "Export Unity JSON".
// Field names have to stay as they are: JsonUtility matches them by name.
namespace Ludograph
{
    [Serializable]
    public class LudographParam
    {
        public string key;
        public string value;
        // "string", "number" or "boolean"
        public string valueType;

        public float AsFloat() => float.TryParse(value, System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture, out var f) ? f : 0f;

        public bool AsBool() => value == "true";
    }

    [Serializable]
    public class LudographNode
    {
        public string id;
        public string graphId;
        public string kind;
        public string title;
        public string description;
        // "mechanics", "dynamics" or "aesthetics"
        public string mda;
        // 0 core, 1 secondary, 2 progression, 3 narrative, -1 not in the onion
        public int layer;
        public string status;
        public List<string> tags;
        // "params" is a C# keyword, so the field needs the @ prefix to keep the JSON name.
        public List<LudographParam> @params;
        public float x;
        public float y;
        public string childGraphId;
        public string aestheticType;
        public string resourceRole;
        public string contentCost;
        // "full", "stub", "skip" or empty
        public string prototypeScope;
        public string returnHook;
        // 0 to 100 each, -1 when not set
        public float oceanO;
        public float oceanC;
        public float oceanE;
        public float oceanA;
        public float oceanN;
    }

    [Serializable]
    public class LudographEdge
    {
        public string id;
        public string graphId;
        // feeds, requires, unlocks, triggers, modifies, conflicts, leadsTo, serves
        public string kind;
        public string source;
        public string target;
        public string label;
    }

    [Serializable]
    public class LudographGraph
    {
        public string id;
        public string name;
        public string parentNodeId;
    }

    [Serializable]
    public class LudographData
    {
        public int schemaVersion;
        public string projectId;
        public string name;
        public string designOrder;
        public bool coreOnly;
        public List<LudographGraph> graphs;
        public List<LudographNode> nodes;
        public List<LudographEdge> edges;
    }
}
