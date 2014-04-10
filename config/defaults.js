define({
    "appid": "", 
    "webmap": "",
    "oauthappid": null,//"AFTKRmv16wj14N3z",
    //Group templates must support a group url parameter. This will contain the id of the group. 
    //group: "",
    //Enter the url to the proxy if needed by the applcation. See the 'Using the proxy page' help topic for details
    //http://developers.arcgis.com/en/javascript/jshelp/ags_proxy.html
    "proxyurl": "resources/PHP/proxy.php",
    "dataCollections": ["KeyUSFacts", "Policy"],
    "analysisVariables":["KeyUSFacts.TOTPOP_CY", "KeyUSFacts.TOTHH_CY", "Policy.POP15_CY", "Policy.POP65U_CY", "KeyUSFacts.OWNER_CY", "KeyUSFacts.RENTER_CY"],
    "enrichLayerUrl": location.protocol + "//analysis.arcgis.com/arcgis/rest/services/tasks/GPServer/EnrichLayer",
    "geoenrichurl": location.protocol + "//geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver/GeoEnrichment",
    "gpurl": location.protocol + "//limgp:6080/arcgis/rest/services/MultiPolyEnrich/GPServer/Multiple%20Polygon%20Enrich",
    //Example of a template specific property. If your template had several color schemes
    //you could define the default here and setup configuration settings to allow users to choose a different
    //color theme.  
    "theme": "", 
    "bingmapskey": "", //Enter the url to your organizations bing maps key if you want to use bing basemaps
    "sharinghost": location.protocol + "//disasterresponse.maps.arcgis.com", //Defaults to arcgis.com. Set this value to your portal or organization host name. 
    //default values for any items you need using the helper services and units properties. 
    "queryForOrg": false,
    // This template is localized. Keep true.
    "localize": false,
    // custom URL parameters for this template
    "urlItems": [
        "sharinghost"
    ],
    "units": null,
    "helperServices": {
        "geometry": {
            "url": null
        },
        "printTask": {
            "url": null
        },
        "elevationSync": {
            "url": null
        },
        "geocode": [{
            "url": null
           }]
    }
});