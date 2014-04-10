define([
    "dojo/ready",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/connect",
    "esri/arcgis/utils",
    "esri/arcgis/Portal",
    "dojo/on",
    "esri/tasks/query",
    "esri/request",
    "dijit/Dialog",
    "dojo/dom-construct",
    "dojo/dom",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/Deferred",
    "dojo/_base/fx",
    "dojo/dom-geometry",
    "dojo/json",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "esri/layers/FeatureLayer",
    "esri/InfoTemplate",
    "dojo/dom-attr",
    "esri/tasks/Geoprocessor"
],
    function (
        ready,
        declare,
        lang,
        connect,
        arcgisUtils,
        esriPortal,
        on,
        Query,
        esriRequest,
        Dialog,
        domConstruct,
        dom,
        domStyle,
        domClass,
        Deferred,
        fx,
        domGeom,
        JSON,
        BorderContainer, ContentPane,
        FeatureLayer,
        InfoTemplate,
        domAttr,
        Geoprocessor
    ) {
        return declare("", null, {
            config: {},
            startup: function (config) {
                // config will contain application and user defined info for the template such as i18n strings, the web map id
                // and application id
                // any url parameters and any application specific configuration information.
                if (config) {
                    //config will contain application and user defined info for the template such as i18n strings, the web map id
                    // and application id
                    // any url parameters and any application specific configuration information. 
                    this.config = config;
                    // set starting percentage
                    this._currentPercentage = 30;
                    // start containers
                    this._containers();
                    if (!this.config.theme) {
                        // theme classes
                        this.themes = ['theme1', 'theme2', 'theme3'];
                        // random number 1-3;
                        var rn = Math.floor(Math.random() * this.themes.length);
                        this.config.theme = this.themes[rn];
                    }
                    // add random class
                    domClass.add(document.body, 'appReady ' + this.config.theme);
                    this._setFormValues();
                    // once ready
                    ready(lang.hitch(this, function () {
                        // on window resize
                        on(window, 'resize', lang.hitch(this, function () {
                            var pb = domGeom.getMarginBox(dom.byId('progress_bar')).w;
                            var nw = pb * (this._currentPercentage / 100);
                            domStyle.set(dom.byId('progressWidth'), 'width', nw + "px");
                        }));
                        on(dom.byId('start'), 'click', lang.hitch(this, function () {
                            this._start();
                        }));
                    }));
                } else {
                    var error = new Error("Main:: Config is not defined");
                    this.reportError(error);
                }
            },
            reportError: function (error) {
                // remove loading class from body
                domClass.remove(document.body, "app-loading");
                domClass.add(document.body, "app-error");
                // an error occurred - notify the user. In this example we pull the string from the
                // resource.js file located in the nls folder because we've set the application up
                // for localization. If you don't need to support multiple languages you can hardcode the
                // strings here and comment out the call in index.html to get the localization strings.
                // set message
                var node = dom.byId("loading_message");
                if (node) {
                    if (this.config && this.config.i18n) {
                        node.innerHTML = this.config.i18n.map.error + ": " + error.message;
                    } else {
                        node.innerHTML = "Unable to create map: " + error.message;
                    }
                }
            },
            _slug: function (value) {
                // Trim start
                // Trim end
                // Camel case is bad
                // Exchange invalid chars
                // Swap whitespace for single character
                return value.replace(/^\s\s*/, '').replace(/\s\s*$/, '').toLowerCase().replace(/[^a-z0-9_\-~!\+\s]+/g, '').replace(/[\s]+/g, '_');
            },
            _shareItem: function (itemId) {
                var user = this._portal.getPortalUser();
                var token = user.credential.token;
                var url = 'https://www.arcgis.com/sharing/rest/content/users/' + user.username + '/items/' + itemId + '/share';
                var params = {
                    url: url,
                    timeout: 2400000,
                    content: {
                        "everyone": true,
                        "org": true,
                        "groups": "",
                        "f": "json",
                        "token": token
                    },
                    handleAs: "json",
                    callbackParamName: "callback"
                };
                // make request
                return esriRequest(params, {
                    usePost: true
                });
            },
            _setFormValues: function () {
                this.form_portal = dom.byId('form_portal');
                if (this.form_portal) {
                    this.form_portal.value = this.config.sharinghost;
                }
                this.form_webmap = dom.byId('form_webmap');
                if (this.form_webmap) {
                    this.form_webmap.value = this.config.webmap;
                }
            },
            _getFormValues: function () {
                if (this.form_portal.value) {
                    this.config.sharinghost = this.form_portal.value;
                }
                if (this.form_webmap.value) {
                    this.config.webmap = this.form_webmap.value;
                }
            },
            _start: function () {
                this._getFormValues();
                this._createDialog();
                this._portal = new esriPortal.Portal(this.config.sharinghost);
                connect.connect(this._portal, 'onLoad', lang.hitch(this, function () {
                    this._portal.signIn().then(lang.hitch(this, function () {
                        domClass.add(document.body, 'loggedIn');
                        this._bc.layout();
                        this._createWebMap();
                    }), lang.hitch(this, function (error) {
                        this._error("You must log in. " + JSON.stringify(error));
                    }));
                }));
            },
            _containers: function () {
                this._bc = new BorderContainer({}, dom.byId('bc'));
                // create a ContentPane as the left pane in the BorderContainer
                var cp1 = new ContentPane({
                    region: "top"
                }, dom.byId('cptop'));
                this._bc.addChild(cp1);
                // create a ContentPane as the center pane in the BorderContainer
                var cp2 = new ContentPane({
                    region: "center"
                }, dom.byId('cpcenter'));
                this._bc.addChild(cp2);
                // right panel
                var cp3 = new ContentPane({
                    region: "right"
                }, dom.byId('cpright'));
                this._bc.addChild(cp3);
                this._bc.startup();
            },
            _animateLabel: function (label) {
                var node = dom.byId('progress_label');
                if (node) {
                    node.innerHTML = label;
                }
            },
            _animateProgress: function (percentage, label) {
                var def = new Deferred();
                this._currentPercentage = percentage;
                if (percentage === 100) {
                    domStyle.set(dom.byId('loading'), 'visibility', 'hidden');
                } else {
                    domStyle.set(dom.byId('loading'), 'visibility', 'visible');
                }
                fx.animateProperty({
                    node: dom.byId('progressWidth'),
                    duration: 500,
                    properties: {
                        width: function () {
                            var maxWidth = domGeom.getMarginBox(dom.byId('progress_bar')).w;
                            return maxWidth * (percentage / 100);
                        }
                    },
                    onEnd: function (node) {
                        def.resolve(node);
                    }
                }).play();
                def.then(lang.hitch(this, function () {
                    if (typeof label !== 'undefined') {
                        this._animateLabel(label);
                    }
                }));
                return def.promise;
            },
            _createDialog: function () {
                this._message = new Dialog({
                    title: "",
                    content: ""
                }, domConstruct.create("div"));
                this._message.startup();
            },
            _runCustomGP: function (featureSet) {
                var def = new Deferred();
                // spatial reference
                var wkid = this.map.extent.spatialReference.wkid;
                // create geoprocessing task
                this._customGP = new Geoprocessor(this.config.gpurl);
                // settings
                var params = {
                    "Impact_Area": featureSet,
                    "processSR": wkid,
                    "outSR": wkid
                };
                // submit enrichment
                this._customGP.submitJob(params, def.resolve, def.progress, def.reject);
                // return deferred
                return def.promise;
            },
            _createResultsLayer: function () {
                this.resultsLayer = new FeatureLayer(this._resultsUrl, {
                    mode: FeatureLayer.MODE_ONDEMAND,
                    infoTemplate: new InfoTemplate("Attributes", "${*}"),
                    outFields: ["*"]
                });
            },
            _feed: function () {
                // get layer id
                this.impactLayer = this.map.getLayer(dom.byId('layerMenu').value);
                if (!this.impactLayer) {
                    this._error('The impact layer did not load or was not found');
                    return;
                }
                // service name
                var d = new Date().getTime();
                var serviceName = this.impactLayer.name || "Impact Service";
                serviceName += '_';
                serviceName += d;
                this.config.form_service_name = this._slug(serviceName);
                // layer name
                var layerName = 'Impact Layer';
                this.config.form_layer_name = this._slug(layerName);
                // geoenrich variables
                var dataCollections = dom.byId('form_data_collections');
                var dcArray = dataCollections.value.split(',');
                if (dcArray || dcArray.length) {
                    this.config.dataCollections = dcArray;
                }
                domClass.remove(dom.byId('progress_bar'), 'error');
                domClass.remove(dom.byId('progress_bar'), 'warning');
                domStyle.set(dom.byId('progress'), 'display', 'block');
                domStyle.set(dom.byId('serviceResult'), 'display', 'none');
                // remove exising layer
                if (this.resultsLayer) {
                    this.map.removeLayer(this.resultsLayer);
                    this.resultsLayer = null;
                }
                // animate
                this._animateProgress(10, 'Lets Go!').then(lang.hitch(this, function () {
                    if (this.impactLayer) {
                        // set up query
                        var query = new Query();
                        var value = domAttr.get(dom.byId('useExtent'), 'checked');
                        if (value) {
                            // only within extent
                            query.geometry = this.map.extent;
                        }
                        // if where specified
                        query.where = "1=1";
                        // all fields
                        query.outFields = ["*"];
                        // make sure I get them back in my spatial reference
                        query.outSpatialReference = this.map.extent.spatialReference;
                        // animate
                        this._animateProgress(this._currentPercentage + 10, 'Query Features').then(lang.hitch(this, function () {
                            // get all features
                            this.impactLayer.queryFeatures(query).then(lang.hitch(this, function (fs) {
                                // got features
                                console.log("features", fs);
                                // if we get results back
                                if (fs && fs.features && fs.features.length) {
                                    // update progress
                                    this._animateProgress(this._currentPercentage + 20, 'Getting Business & Infrastructure Data').then(lang.hitch(this, function () {
                                        // GP task
                                        this._runCustomGP(fs).then(lang.hitch(this, function (gpResponse) {
                                            console.log("GP Response", gpResponse);
                                            this._animateProgress(this._currentPercentage + 10, 'Getting Custom GP result').then(lang.hitch(this, function () {
                                                this._getCustomGPResult(gpResponse).then(lang.hitch(this, function(gpResults){
                                                    // got GP Results
                                                    console.log("GP Results", gpResults);
                                                    // get gp results features and fields
                                                    var gpValue = gpResults.value;
                                                    // update status when GP done
                                                    this._animateProgress(this._currentPercentage + 10, 'Enriching Data').then(lang.hitch(this, function () {
                                                        // enrich layer and create service
                                                        this._enrichLayer(gpValue).then(lang.hitch(this, function (layerResponse) {
                                                            // got layer enrichment
                                                            console.log("Layer Enrich", layerResponse);
                                                            this._animateProgress(this._currentPercentage + 10, 'Getting Layer result').then(lang.hitch(this, function () {
                                                                this._getEnrichResult(layerResponse).then(lang.hitch(this, function (resultsResponse) {
                                                                    // got features
                                                                    console.log("Layer Enrich Result", resultsResponse);
                                                                    this._resultsUrl = resultsResponse.value.url;
                                                                    this._serviceId = resultsResponse.value.itemId;
                                                                    // animate
                                                                    this._animateProgress(this._currentPercentage + 10, 'Sharing Layer').then(lang.hitch(this, function () {
                                                                        // add new layer
                                                                        this._shareItem(resultsResponse.value.itemId).then(lang.hitch(this, function () {
                                                                            this._createResultsLayer();
                                                                            this.map.addLayer(this.resultsLayer);
                                                                            this.impactLayer.hide();
                                                                            this.resultsLayer.show();
                                                                            this._success();
                                                                            this._animateProgress(100, 'Success');
                                                                            return true;
                                                                        }), lang.hitch(this, function (error) {
                                                                            this._error("Sharging service failed. " + JSON.stringify(error));
                                                                            return error;
                                                                        }));
                                                                    }));
                                                                }), lang.hitch(this, function (error) {
                                                                    this._error("Enrich failed. " + JSON.stringify(error));
                                                                    return error;
                                                                }));
                                                            }));
                                                        }), lang.hitch(this, function (error) {
                                                            this._error("Enrich failed. " + JSON.stringify(error));
                                                            return error;
                                                        }), lang.hitch(this, function (update) {
                                                            // if job failed
                                                            if (update.jobStatus === "esriJobFailed") {
                                                                this._error("Enrich failed. " + JSON.stringify(update.messages[0].description));
                                                                var error = new Error(update.messages[0].description);
                                                                return error;
                                                            }
                                                            else{
                                                                this._animateProgress(this._currentPercentage, 'Enriching - Job Executing');
                                                            }
                                                        }));
                                                    }));
                                                }), lang.hitch(this, function (error) {
                                                    this._error("GP failed. " + JSON.stringify(error));
                                                    return error;
                                                }));
                                            }));
                                        }), lang.hitch(this, function (error) {
                                            this._error("GP failed. " + JSON.stringify(error));
                                            return error;
                                        }));
                                    }));
                                } else {
                                    this._error("no features");
                                }
                            }), lang.hitch(this, function (error) {
                                this._error("Could not get features. " + JSON.stringify(error));
                            }));
                        }));
                    }
                }));
            },
            _getEnrichResult: function (response) {
                var def = new Deferred();
                // get job id
                var jobId = response.jobId;
                // get param
                var parameterName = 'enrichedLayer';
                // get result data
                this._enrichGP.getResultData(jobId, parameterName, def.resolve, def.reject);
                return def.promise;
            },
            _getCustomGPResult: function (response) {
                var def = new Deferred();
                // get job id
                var jobId = response.jobId;
                // get param
                var parameterName = 'Output_JSON_String';
                // get result data
                this._customGP.getResultData(jobId, parameterName, def.resolve, def.reject);
                return def.promise;
            },
            _success: function () {
                var html = '';
                html += '<h2>Good News!</h2>';
                html += 'Here&#39;s your layer:';
                html += '<ul>';
                html += '<li><a target="_blank" href="' + this.resultsLayer.url + '">Open Enriched Service</a>.</li>';
                html += '<li><a target="_blank" href="' + this.config.sharinghost + '/home/webmap/viewer.html?services=' + this._serviceId + '">Open in new webmap</a></li>';
                html += '<li><a target="_blank" href="' + this.config.sharinghost + '/home/webmap/viewer.html?webmap=' + this.config.webmap + '&services=' + this._serviceId + '">Open in current webmap</a></li>';
                 html += '<li><a target="_blank" href="' + this.config.sharinghost + '/home/item.html?id=' + this._serviceId + '">Open Item Page</a></li>';
                html += '</ul>';
                html += '<p>share it; save it; voilà!</p>';
                var node = dom.byId('serviceResult');
                if (node) {
                    node.innerHTML = html;
                    domStyle.set(node, 'display', 'block');
                }
            },
            _error: function (message) {
                this._message.set('title', 'Error');
                this._message.set('content', message);
                this._message.show();
                this._animateProgress(100, 'Error');
                domClass.add(dom.byId('progress_bar'), 'error');
            },
            _setupLayers: function () {
                var html = '';
                html += '<ul>';
                if (this.layers && this.layers.length) {
                    html += '<li>';
                    html += '<label class="leftLabel" for="layerMenu">Impact Layer:</label>';
                    html += '<select id="layerMenu">';
                    for (var i = 0; i < this.layers.length; i++) {
                        var layer = this.layers[i];
                        html += '<option value="' + layer.id + '">' + layer.title + '</option>';
                    }
                    html += '</select>';
                    html += '</li>';
                }
                html += '<li>';
                html += '<label class="leftLabel" for="form_data_collections">Data Collections:</label>';
                html += '<textarea id="form_data_collections">' + this.config.dataCollections.join() + '</textarea>';
                html += '<div><a id="showDataCollections">Show collections</a></div>';
                html += '</li>';
                html += '<li>';
                html += '<input type="checkbox" id="useExtent" />';
                html += '<label class="rightLabel" for="useExtent">Filter by extent</label>';
                html += '</li>';
                html += '<li>';
                html += '<div id="feedMonster" class="gradient bigButton"><div class="food"></div>Feed Me!<div class="clear"></div></div><div class="clear"></div>';
                html += '</li>';
                html += '</ul>';
                html += '<div class="loadingCon"><img id="loading" src="images/' + this.config.theme + '_loading.gif" class="loading" /></div>';
                var node = dom.byId('layerOptions');
                if (node) {
                    node.innerHTML = html;
                }
            },
            init: function () {
                this._setupLayers();
                on(dom.byId('feedMonster'), 'click', lang.hitch(this, function () {
                    this._feed();
                }));
                on(dom.byId('showDataCollections'), 'click', lang.hitch(this, function () {
                    this._showDataCollections();
                }));
                domStyle.set(dom.byId('feedMonster'), 'display', 'block');
                domStyle.set(dom.byId('options'), 'display', 'block');
            },
            _showDataCollections: function () {
                var user = this._portal.getPortalUser();
                var token = user.credential.token;
                var w = screen.width / 2;
                var h = screen.height / 1.5;
                var left = (screen.width / 2) - (w / 2);
                var top = (screen.height / 2) - (h / 2);
                var windowOptions = 'toolbar=no, location=no, directories=no, status=yes, menubar=no, scrollbars=yes, resizable=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left;
                var dcPage = window.open("", "data_collections", windowOptions, true);
                return esriRequest({
                    url: this.config.geoenrichurl + '/dataCollections/United%20States',
                    timeout: 300000,
                    content: {
                        "f": "json",
                        "token": token
                    },
                    handleAs: "json",
                    callbackParamName: "callback"
                }).then(function (response) {
                    var dc = response.DataCollections;
                    var html = '';
                    html += '<!DOCTYPE HTML>';
                    html += '<html lang="en">';
                    html += '<head>';
                    html += '<meta charset="utf-8">';
                    html += '<meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1">';
                    html += '<title>Data Collections</title>';
                    html += '</head>';
                    html += '<body>';
                    if (dc.length) {
                        for (var i = 0; i < dc.length; i++) {
                            var c = dc[i];
                            var id = c.dataCollectionID;
                            var title = c.metadata.title;
                            var description = c.metadata.longDescription;
                            html += '<h2>' + title + '</h2>';
                            html += '<label>ID:</label><input type="text" value="' + id + '" />';
                            html += '<p>' + description + '</p>';
                            html += '<ul>';
                            for (var j = 0; j < c.data.length; j++) {
                                var variable = c.data[j].alias;
                                html += '<li>' + variable + '</li>';
                            }
                            html += '</ul>';
                        }
                    }
                    html += '</body>';
                    html += '</html>';
                    dcPage.document.open("text/html", "replace");
                    dcPage.document.write(html);
                    dcPage.document.close();
                }, function (error) {
                    console.log(error);
                });
            },
            _enrichLayer: function (results) {
                var def = new Deferred();
                // spatial reference
                var wkid = this.map.extent.spatialReference.wkid;
                // create geoprocessing task
                this._enrichGP = new Geoprocessor(this.config.enrichLayerUrl);
                // settings
                var params = {
                    "inputLayer": JSON.stringify({

                        "layerDefinition": {
                            "geometryType": results.geometryType,
                            "fields": results.fields
                        },
                        "featureSet": {
                            "features": results.features,
                            "spatialReference": {
                                "wkid": wkid
                            },
                            "geometryType": results.geometryType
                        }

                    }),
                    "datacollections": this.config.dataCollections,
                    "country": "US",
                    "outputName": JSON.stringify({
                        "serviceProperties": {
                            "name": this.config.form_service_name
                        }
                    })
                };
                // submit enrichment
                this._enrichGP.submitJob(params, def.resolve, def.progress, def.reject);
                // return deferred
                return def.promise;
            },
            //create a map based on the input web map id
            _createWebMap: function () {
                arcgisUtils.createMap(this.config.webmap, "mapDiv", {
                    mapOptions: {
                        //Optionally define additional map config here for example you can 
                        //turn the slider off, display info windows, disable wraparound 180, slider position and more. 
                    },
                    bingMapsKey: this.config.bingmapskey
                }).then(lang.hitch(this, function (response) {
                    //Once the map is created we get access to the response which provides important info 
                    //such as the map, operational layers, popup info and more. This object will also contain
                    //any custom options you defined for the template. In this example that is the 'theme' property.
                    //Here' we'll use it to update the application to match the specified color theme.  
                    this.response = response;
                    this.map = response.map;
                    this.itemInfo = response.itemInfo;
                    this.layers = response.itemInfo.itemData.operationalLayers;
                    if (this.map.loaded) {
                        this.init();
                    } else {
                        on(this.map, "load", lang.hitch(this, function () {
                            this.init();
                        }));
                    }
                }), this.reportError);
            }
        });
    });