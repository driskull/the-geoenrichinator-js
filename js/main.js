define([
    "dojo/ready", 
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/connect",
    "esri/arcgis/utils",
    "esri/IdentityManager",
    "esri/arcgis/Portal",
    "dojo/on",
    "esri/tasks/query",
    "esri/graphic",
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
    "dojo/promise/all",
    "application/schema",
    "application/service",
    "esri/layers/FeatureLayer",
    "esri/InfoTemplate",
    "dojo/dom-attr"
],
function(
    ready, 
    declare,
    lang,
    connect,
    arcgisUtils,
    IdentityManager,
    esriPortal,
    on,
    Query,
    Graphic,
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
    all,
    schemaJSON,
    serviceJSON,
    FeatureLayer,
    InfoTemplate,
    domAttr
) {
    return declare("", null, {
        config: {},
        constructor: function(config) {
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
            ready(lang.hitch(this, function() {
                // on window resize
                on(window, 'resize', lang.hitch(this, function() {
                    var pb = domGeom.getMarginBox(dom.byId('progress_bar')).w;
                    var nw = pb * (this._currentPercentage / 100);
                    domStyle.set(dom.byId('progressWidth'), 'width', nw + "px");
                }));
                on(dom.byId('start'), 'click', lang.hitch(this, function() {
                    this._start();
                }));
            }));
        },
        _slug: function(Text) {
            return Text.toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'_');
        },
        _shareItem: function(itemId){
            var user = this._portal.getPortalUser();
            var token = user.credential.token;
            var url = 'https://www.arcgis.com/sharing/rest/content/users/' + user.username + '/items/' + itemId + '/share';
            // make request
            return esriRequest({
                url: url,
                timeout: 2400000,
                content: {
                    "everyone": true,
                    "org": true,
                    "groups":"",
                    "f": "json",
                    "token": token
                },
                handleAs: "json",
                callbackParamName: "callback"
            }, {
                usePost: true
            });
        },
        _createService: function() {
            var user = this._portal.getPortalUser();
            var token = user.credential.token;
            var url = 'https://www.arcgis.com/sharing/rest/content/users/' + user.username + '/createService';
            // Set service name
            serviceJSON.name = this.config.form_service_name;
            // make request
            return esriRequest({
                url: url,
                timeout: 2400000,
                content: {
                    "createParameters": JSON.stringify(serviceJSON),
                    "targetType": "featureService",
                    "f": "json",
                    "token": token
                },
                handleAs: "json",
                callbackParamName: "callback"
            }, {
                usePost: true
            });
        },
        _setFormValues: function() {
            this.form_portal = dom.byId('form_portal');
            if (this.form_portal) {
                this.form_portal.value = this.config.sharinghost;
            }
            this.form_webmap = dom.byId('form_webmap');
            if (this.form_webmap) {
                this.form_webmap.value = this.config.webmap;
            }
        },
        _getFormValues: function() {
            if (this.form_portal.value) {
                this.config.sharinghost = this.form_portal.value;
            }
            if (this.form_webmap.value) {
                this.config.webmap = this.form_webmap.value;
            }
        },
        _start: function() {
            this._getFormValues();
            this._createDialog();
            this._portal = new esriPortal.Portal(this.config.sharinghost);
            connect.connect(this._portal, 'onLoad', lang.hitch(this, function() {
                this._portal.signIn().then(lang.hitch(this, function() {
                    domClass.add(document.body, 'loggedIn');
                    this._bc.layout();
                    this._createWebMap();
                }), lang.hitch(this, function(error) {
                    this._error("You must log in. " + JSON.stringify(error));
                }));
            }));
        },
        _containers: function() {
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
        _animateLabel: function(label) {
            var node = dom.byId('progress_label');
            if (node) {
                node.innerHTML = label;
            }
        },
        _animateProgress: function(percentage, label) {
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
                    width: function() {
                        var maxWidth = domGeom.getMarginBox(dom.byId('progress_bar')).w;
                        return maxWidth * (percentage / 100);
                    }
                },
                onEnd: function(node) {
                    def.resolve(node);
                }
            }).play();
            return def.then(lang.hitch(this, function() {
                if (typeof label !== 'undefined') {
                    this._animateLabel(label);
                }
            }));
        },
        _createDialog: function() {
            this._message = new Dialog({
                title: "",
                content: ""
            }, domConstruct.create("div"));
            this._message.startup();
        },
        _addToken: function(ioArgs) {
            var user;
            // if url contains applyEdits
            if(ioArgs && (ioArgs.url.indexOf("applyEdits") > -1)) {
                if (this._portal) {
                    user = this._portal.getPortalUser();
                }
                if (user) {
                    ioArgs.content.token = user.credential.token;
                }
            }
            // don't forget to return ioArgs.
            return ioArgs;
        },
        _runGP: function(featureSet) {
            var feats = [];
            if (featureSet && featureSet.features && featureSet.features.length) {
                for (var i = 0; i < featureSet.features.length; i++) {
                    var feat = featureSet.features[i];
                    feats.push({
                        attributes: {},
                        geometry: {
                            rings: feat.geometry.rings
                        }
                    });
                }
            }
            var formatted = {
                features: feats,
                fields: [],
                geometryType: featureSet.geometryType,
                spatialReference: {
                    wkid: featureSet.spatialReference.wkid
                }
            };
            console.log('Start GP', formatted);
            return esriRequest({
                url: this.config.gpurl + '/execute',
                timeout: 2400000,
                content: {
                    "Impact_Area": JSON.stringify(formatted),
                    "f": "json",
                    "processSR": this.map.extent.spatialReference.wkid,
                    "outSR": this.map.extent.spatialReference.wkid
                },
                handleAs: "json",
                callbackParamName: "callback"
            });
        },
        _setFSInfo: function(url) {
            this._resultsUrl = url;
            esriRequest.setRequestPreCallback(lang.hitch(this, function(ioArgs) {
                return this._addToken(ioArgs);
            }));
            this._setAdminUrl();
        },
        _createResultsLayer: function() {
            this.resultsLayer = new FeatureLayer(this._resultsUrl + "/0", {
                mode: FeatureLayer.MODE_ONDEMAND,
                infoTemplate: new InfoTemplate("Attributes", "${*}"),
                outFields: ["*"]
            });
        },
        _updateFeatures: function() {
            this.impactLayer = this.map.getLayer(dom.byId('layerMenu').value);
            if (!this.impactLayer) {
                this._error('The impact layer did not load or was not found');
                return;
            }
            this.form_service_name = dom.byId('form_service_name');
            this.config.form_service_name = this._slug(this.form_service_name.value);
            if (!this.config.form_service_name) {
                var d = new Date().getTime();
                this.config.form_service_name = this.config.default_title + d;
            }
            this.form_layer_name = dom.byId('form_layer_name');
            this.config.form_layer_name = this._slug(this.form_layer_name.value);
            if (!this.config.form_layer_name) {
                this.config.form_layer_name = this.config.default_title;
            }
            this.form_data_collections = dom.byId('form_data_collections');
            this.config.dataCollections = this.form_data_collections.value.split(',');
            if (!this.config.dataCollections || !this.config.dataCollections.length) {
                this.config.dataCollections = ["Age", "HouseholdsByIncome"];
            }
            domClass.remove(dom.byId('progress_bar'), 'error');
            domClass.remove(dom.byId('progress_bar'), 'warning');
            domStyle.set(dom.byId('progress'), 'display', 'block');
            domStyle.set(dom.byId('serviceResult'), 'display', 'none');
            if (this.resultsLayer) {
                this.map.removeLayer(this.resultsLayer);
                this.resultsLayer = null;
            }
            this._animateProgress(20, 'Running').then(lang.hitch(this, function() {
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
                    // make sure I get them back in my spatial reference
                    query.outSpatialReference = this.map.extent.spatialReference;
                    // get all features
                    this.impactLayer.queryFeatures(query).then(lang.hitch(this, function(fs) {
                        this._animateProgress(this._currentPercentage + 10, 'Got Features');
                        // if we get results back
                        if (fs && fs.features && fs.features.length) {
                            // set original graphics here
                            var graphics = fs.features;
                            // update progress
                            this._animateProgress(40, 'Enriching').then(lang.hitch(this, function() {
                                // GP task
                                var gpPromise = this._runGP(fs).then(lang.hitch(this, function(results) {
                                    // update status when GP done
                                    this._animateProgress(this._currentPercentage + 10, 'GP Finished');
                                    // pass back with results
                                    return results;
                                }), lang.hitch(this, function(error) {
                                    this._error("GP failed. " + JSON.stringify(error));
                                    return error;
                                }));
                                // geoenrich task
                                var enrichPromise = this._geoenrich(fs).then(lang.hitch(this, function(results) {
                                    // update status when enrich done
                                    this._animateProgress(this._currentPercentage + 10, 'Enrich Finished');
                                    // pass back with results
                                    return results;
                                }), lang.hitch(this, function(error) {
                                    this._error("Geoenrich failed. " + JSON.stringify(error));
                                    return error;
                                }));
                                // When all tasks complete
                                all({
                                    gp: gpPromise,
                                    enrich: enrichPromise
                                }).then(lang.hitch(this, function(results) {
                                    var gpFS, enrichedFS, gpFeatures, enrichedFeatures, schemaSuccess, serviceSuccess, serviceFields = [];
                                    // add impact fields
                                    serviceFields = this._addUniqueFields(serviceFields, this.impactLayer.fields);
                                    try {
                                        gpFS = results.gp.results[0].value;
                                        gpFeatures = gpFS.features;
                                        serviceFields = this._addUniqueFields(serviceFields, gpFS.fields);
                                        console.log('GP Finished', gpFeatures);
                                    } catch (error) {
                                        this._error("GP missing results. " + JSON.stringify(error));
                                        return;
                                    }
                                    // test for enriched feature set
                                    try {
                                        enrichedFS = results.enrich.results[0].value.FeatureSet[0];
                                        enrichedFeatures = enrichedFS.features;
                                        serviceFields = this._addUniqueFields(serviceFields, enrichedFS.fields);
                                        console.log('Geoenrich Finished', enrichedFeatures);
                                    } catch (error) {
                                        this._error("Geoenrich missing results. " + JSON.stringify(error));
                                        return;
                                    }
                                    // create service
                                    this._createService().then(lang.hitch(this, function(results) {
                                        this._animateProgress(this._currentPercentage + 10, 'Service Created');
                                        serviceSuccess = results.success;
                                        if (!serviceSuccess) {
                                            this._error("Could not create service.");
                                            return;
                                        }
                                        // created service id
                                        this._serviceId = results.itemId;
                                        // set url information
                                        this._setFSInfo(results.serviceurl);
                                        // share item with everyone
                                        this._shareItem(results.itemId);
                                        // update layer
                                        this._addDefinition(serviceFields).then(lang.hitch(this, function(results) {
                                            this._animateProgress(this._currentPercentage + 10, 'Schema Updated');
                                            // test for successul schema edit
                                            console.log("schema results", results);
                                            schemaSuccess = results.success;
                                            if (!schemaSuccess) {
                                                return;
                                            }
                                            // lets add the layer
                                            this._createResultsLayer();
                                            // if we got everthing we need
                                            if (graphics.length && gpFeatures && enrichedFeatures) {
                                                // set mixed in attributes from results
                                                for (var i = 0; i < graphics.length; i++) {
                                                    var mixed = lang.mixin(graphics[i].attributes, gpFeatures[i].attributes, enrichedFeatures[i].attributes);
                                                    graphics[i].setAttributes(mixed);
                                                }
                                                // update progress
                                                this._animateProgress(90, 'Updating features').then(lang.hitch(this, function() {
                                                    console.log('Start Edit', graphics);
                                                    // edit the features with new attributes
                                                    this.resultsLayer.applyEdits(graphics, null, null, lang.hitch(this, function() {
                                                        // add new layer
                                                        this.map.addLayer(this.resultsLayer);
                                                        this.impactLayer.hide();
                                                        this.resultsLayer.show();
                                                        this._success();
                                                        this._animateProgress(100, 'Success');
                                                    }), lang.hitch(this, function(error) {
                                                        this._error("Editing failed. " + JSON.stringify(error));
                                                    }));
                                                }));
                                            } else {
                                                this._error("Features failure.");
                                            }
                                        }), lang.hitch(this, function(error) {
                                            this._error("Could not add feature definition. " + JSON.stringify(error));
                                        }));
                                    }), lang.hitch(this, function(error) {
                                        this._error("Could not create service. " + JSON.stringify(error));
                                    }));
                                }));
                            }));
                        } else {
                            this._error("no features");
                        }
                    }), lang.hitch(this, function(error) {
                        this._error("Could not get features. " + JSON.stringify(error));
                    }));
                }
            }));
        },
        _addUniqueFields: function(currentFields, newFields){
            // unique fields
            var unique = [];
            // if new fields
            if(newFields && newFields.length){
                // each new field
                for(var i = 0; i < newFields.length; i++){
                    // new field name
                    var newFieldName = newFields[i].name;
                    var addField = true;
                    // check each current field
                    for(var j = 0; j < currentFields.length; j++){
                        var currentFieldName = currentFields[j].name;
                        // if field already exists
                        if(newFieldName.toLowerCase() === currentFieldName.toLowerCase()){
                            // dont add
                            addField = false;
                            break;
                        }
                    }
                    if(addField){
                        unique.push(newFields[i]);
                    }
                }
            }
            return currentFields.concat(unique);
        },
        _success: function() {
            var user = this._portal.getPortalUser();
            var token = user.credential.token;
            var html = '';
            html += '<h2>Good News!</h2>';
            html += 'Here&#39;s your layer:';
            html += '<ul>';
            html += '<li><a target="_blank" href="' + this.resultsLayer.url + '">Open Enriched Service</a>.</li>';
            html += '<li><a target="_blank" href="' + this.config.sharinghost + '/home/webmap/viewer.html?services=' + this._serviceId + '">Open in new webmap</a></li>';
            html += '<li><a target="_blank" href="' + this.config.sharinghost + '/home/webmap/viewer.html?webmap=' + this.config.webmap + '&services=' + this._serviceId + '">Open in current webmap</a></li>';
            html += '</ul>';
            html += '<p>share it; save it; voilà!</p>';
            var node = dom.byId('serviceResult');
            if (node) {
                node.innerHTML = html;
                domStyle.set(node, 'display', 'block');
            }
        },
        _error: function(message) {
            this._message.set('title', 'Error');
            this._message.set('content', message);
            this._message.show();
            this._animateProgress(100, 'Error');
            domClass.add(dom.byId('progress_bar'), 'error');
        },
        _setAdminUrl: function() {
            this._resultsAdminUrl = this._resultsUrl.replace('/rest/', '/admin/').replace('/FeatureServer', '.FeatureServer');
        },
        _setupLayers: function() {
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
            html += '<label class="leftLabel" for="form_service_name">Result Service Name:</label>';
            html += '<input type="text" id="form_service_name" value="' + this.config.form_service_name + '" />';
            html += '</li>';
            html += '<li>';
            html += '<label class="leftLabel" for="form_layer_name">Result Layer Name:</label>';
            html += '<input type="text" id="form_layer_name" value="' + this.config.form_layer_name + '" />';
            html += '</li>';
            html += '<li>';
            html += '<label class="leftLabel" for="form_data_collections">Data Collections:</label>';
            html += '<input type="text" id="form_data_collections" value="' + this.config.dataCollections.join() + '" />';
            html += '<div><a id="showDataCollections">Show collections</a></div>';
            html += '</li>';
            html += '<li>';
            html += '<input type="checkbox" id="useExtent" />';
            html += '<label class="rightLabel" for="useExtent">Filter by extent</label>';
            html += '</li>';
            html += '<li>';
            html += '<div id="applyEdits" class="gradient bigButton"><div class="food"></div>Feed Me!<div class="clear"></div></div><div class="clear"></div>';
            html += '</li>';
            html += '</ul>';
            html += '<div class="loadingCon"><img id="loading" src="images/' + this.config.theme + '_loading.gif" class="loading" /></div>';
            var node = dom.byId('layerOptions');
            if (node) {
                node.innerHTML = html;
            }
        },
        init: function() {
            this._setupLayers();
            on(dom.byId('applyEdits'), 'click', lang.hitch(this, function() {
                this._updateFeatures();
            }));
            on(dom.byId('showDataCollections'), 'click', lang.hitch(this, function() {
                this._showDataCollections();
            }));
            domStyle.set(dom.byId('applyEdits'), 'display', 'block');
            domStyle.set(dom.byId('options'), 'display', 'block');
        },
        _showDataCollections: function() {
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
            }).then(function(response) {
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
            }, function(error) {
                console.log(error);
            });
        },
        _formatFields: function(fields) {
            var formatted = [];
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                if (
                field.type !== "esriFieldTypeOID" && field.name.toLowerCase() !== 'objectid' && field.name.toLowerCase() !== 'fid' && field.name.toLowerCase() !== 'shape_length' && field.name.toLowerCase() !== 'shape_area' && field.name.toLowerCase() !== 'shape') {
                    formatted.push(field);
                }
            }
            return formatted;
        },
        _addDefinition: function(fields) {
            var user = this._portal.getPortalUser();
            var token = user.credential.token;
            // Layer Name
            schemaJSON.layers[0].name = this.config.form_layer_name;
            // schema layer extent
            schemaJSON.layers[0].extent = this.map.extent;
            // scale
            schemaJSON.layers[0].minScale = this.impactLayer.minScale;
            schemaJSON.layers[0].maxScale = this.impactLayer.maxScale;
            // add impact layer fields to schema
            schemaJSON.layers[0].fields = schemaJSON.layers[0].fields.concat(this._formatFields(fields));
            console.log('fields', schemaJSON.layers[0].fields);
            // make request
            return esriRequest({
                url: this._resultsAdminUrl + '/AddToDefinition',
                timeout: 300000,
                content: {
                    "addToDefinition": JSON.stringify(schemaJSON),
                    "f": "json",
                    "token": token
                },
                handleAs: "json",
                callbackParamName: "callback"
            });
        },
        _geoenrich: function(featureSet) {
            var features = featureSet.features;
            // Areas to enrich
            var studyAreas = [];
            var wkid = this.map.extent.spatialReference.wkid;
            // lets go through all the features
            if (features && features.length) {
                for (var i = 0; i < features.length; i++) {
                    var feat = features[i];
                    // dont pass any attributes from the feature
                    var attributes = {};
                    // create study area
                    var area = {
                        geometry: {
                            rings: feat.geometry.rings,
                            spatialReference: {
                                wkid: wkid
                            }
                        },
                        attributes: attributes
                    };
                    studyAreas.push(area);
                }
            }
            console.log('Start Geoenrich', studyAreas);
            // make request for enriched data
            return esriRequest({
                url: this.config.geoenrichurl + "/enrich",
                timeout: 2400000,
                content: {
                    "studyareas": JSON.stringify(studyAreas),
                    "f": "json",
                    "forStorage": true,
                    "returnGeometry": false,
                    "usedata": JSON.stringify({
                        "sourcecountry": "US"
                    }),
                    "datacollections": JSON.stringify(this.config.dataCollections),
                    "insr": JSON.stringify({
                        "wkid": wkid
                    }),
                    "outsr": JSON.stringify({
                        "wkid": wkid
                    })
                },
                handleAs: "json",
                callbackParamName: "callback"
            });
        },
        //create a map based on the input web map id
        _createWebMap: function() {
            arcgisUtils.createMap(this.config.webmap, "mapDiv", {
                mapOptions: {
                    //Optionally define additional map config here for example you can 
                    //turn the slider off, display info windows, disable wraparound 180, slider position and more. 
                },
                bingMapsKey: this.config.bingmapskey
            }).then(lang.hitch(this, function(response) {
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
                    on(this.map, "load", lang.hitch(this, function() {
                        this.init();
                    }));
                }
            }), lang.hitch(this, function(error) {
                //an error occurred - notify the user. In this example we pull the string from the 
                //resource.js file located in the nls folder because we've set the application up 
                //for localization. If you don't need to support mulitple languages you can hardcode the 
                //strings here and comment out the call in index.html to get the localization strings. 
                if (this.config && this.config.i18n) {
                    this._error(this.config.i18n.map.error + ": " + error.message);
                } else {
                    this._error("Unable to create map: " + error.message);
                }
            }));
        }
    });
});