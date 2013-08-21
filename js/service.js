define([], function() {
    var service = {
        "maxRecordCount": 2000,
        "supportedQueryFormats": "JSON",
        "capabilities": "Query",
        "description": "Impact Area",
        "allowGeometryUpdates": "false",
        "units": "esriMeters",
        "syncEnabled": "false",
        "editorTrackingInfo": {
            "enableEditorTracking": "false",
            "enableOwnershipAccessControl": "false",
            "allowOthersToUpdate": "false",
            "allowOthersToDelete": "false"
        },
        "xssPreventionInfo": {
            "xssPreventionEnabled": "true",
            "xssPreventionRule": "InputOnly",
            "xssInputRule": "rejectInvalid"
        },
        "tables": [],
        "name": "Enriched Impact Area"
    }
    return service;
});