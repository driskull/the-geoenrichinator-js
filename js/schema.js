define([], function() {
    var schema = {
        "layers": [{
            "adminLayerInfo": {
                "geometryField": {
                    "name": "Shape",
                    "srid": 4326
                }
            },
            "name": "",
            "type": "Feature Layer",
            "displayField": "",
            "description": "",
            "copyrightText": "",
            "defaultVisibility": true,
            "relationships": [],
            "isDataVersioned": false,
            "supportsRollbackOnFailureParameter": true,
            "supportsAdvancedQueries": true,
            "geometryType": "esriGeometryPolygon",
            "minScale": 0,
            "maxScale": 0,
            "extent": {
                "type": "extent",
                "xmin": 165.74787500009276,
                "ymin": -69.56272569807948,
                "xmax": 101.76350000001493,
                "ymax": 84.36364268740425,
                "spatialReference": {
                    "wkid": 4326
                }
            },
            "drawingInfo": {
                "renderer": {
                    "type": "simple",
                    "symbol": {
                        "color": [238, 80, 87, 191],
                        "outline": {
                            "color": [224, 34, 48, 89],
                            "width": 1.5,
                            "type": "esriSLS",
                            "style": "esriSLSSolid"
                        },
                        "type": "esriSFS",
                        "style": "esriSFSSolid"
                    },
                    "label": "",
                    "description": ""
                },
                "transparency": 0,
                "labelingInfo": null
            },
            "allowGeometryUpdates": true,
            "hasAttachments": true,
            "htmlPopupType": "esriServerHTMLPopupTypeNone",
            "hasM": false,
            "hasZ": false,
            "objectIdField": "OBJECTID",
            "globalIdField": "",
            "typeIdField": "",
            "fields": [{
                "name": "OBJECTID",
                "type": "esriFieldTypeOID",
                "alias": "OBJECTID",
                "sqlType": "sqlTypeOther",
                "nullable": false,
                "editable": false,
                "domain": null,
                "defaultValue": null
            }],
            "indexes": [],
            "types": [],
            "templates": [{
                "name": "New Feature",
                "description": "",
                "drawingTool": "esriFeatureEditToolPolygon",
                "prototype": {
                    "attributes": {}
                }
            }],
            "supportedQueryFormats": "JSON",
            "hasStaticData": false,
            "maxRecordCount": 10000,
            "capabilities": "Query,Editing,Create,Update,Delete"
        }]
    };
    return schema;
});