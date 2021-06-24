"use strict";

define(["vue", "vueRouter", "require"], function (Vue, vueRouter, require) {
    Vue.use(vueRouter);
    var router = new vueRouter({
        routes: [
            // { path: "/", redirect: "welcome" },
            {
                path: "/",
                name: "index",
                redirect: '/internet',
                component: function component(resolve) {
                    require(["/src/temple/index/index.js"], resolve);
                },
                children: [{
                    path: "/internet",
                    name: "internet",
                    component: function component(resolve) {
                        require(["/src/temple/internet/index.js"], resolve);
                    }
                }, {
                    path: "/wlan",
                    name: "wlan",
                    component: function component(resolve) {
                        require(["/src/temple/wlan/index.js"], resolve);
                    }
                }, {
                    path: "/lanip",
                    name: "lanip",
                    component: function component(resolve) {
                        require(["/src/temple/lanip/index.js"], resolve);
                    }
                }, {
                    path: "/adminpw",
                    name: "adminpw",
                    component: function component(resolve) {
                        require(["/src/temple/adminpw/index.js"], resolve);
                    }
                }, {
                    path: "/apitest",
                    name: "apitest",
                    component: function component(resolve) {
                        require(["/src/temple/apitest/index.js"], resolve);
                    }
                }, {
                    path: "/attools",
                    name: "attools",
                    component: function component(resolve) {
                        require(["/src/temple/attools/index.js"], resolve);
                    }
                }, {
                    path: "/bridge",
                    name: "bridge",
                    component: function component(resolve) {
                        require(["/src/temple/bridge/index.js"], resolve);
                    }
                },{
                    path: "/clients",
                    name: "clients",
                    component: function component(resolve) {
                        require(["/src/temple/clients/index.js"], resolve);
                    }
                }, {
                    path: "/cloud",
                    name: "cloud",
                    component: function component(resolve) {
                        require(["/src/temple/cloud/index.js"], resolve);
                    }
                }, {
                    path: "/firewall",
                    name: "firewall",
                    component: function component(resolve) {
                        require(["/src/temple/firewall/index.js"], resolve);
                    }
                }, {
                    path: "/knownWifi",
                    name: "knownWifi",
                    component: function component(resolve) {
                        require(["/src/temple/knownWifi/index.js"], resolve);
                    }
                }, {
                    path: "/macclone",
                    name: "macclone",
                    component: function component(resolve) {
                        require(["/src/temple/macclone/index.js"], resolve);
                    }
                }, {
                    path: "/revert",
                    name: "revert",
                    component: function component(resolve) {
                        require(["/src/temple/revert/index.js"], resolve);
                    }
                }, {
                    path: "/sendmsg",
                    name: "sendmsg",
                    component: function component(resolve) {
                        require(["/src/temple/sendmsg/index.js"], resolve);
                    }
                }, {
                    path: "/settings",
                    name: "settings",
                    component: function component(resolve) {
                        require(["/src/temple/settings/index.js"], resolve);
                    }
                }, {
                    path: "/setWifi",
                    name: "setWifi",
                    component: function component(resolve) {
                        require(["/src/temple/setWifi/index.js"], resolve);
                    }
                }, {
                    path: "/smessage",
                    name: "smessage",
                    component: function component(resolve) {
                        require(["/src/temple/smessage/index.js"], resolve);
                    }
                },{
                    path: "/software",
                    name: "software",
                    component: function component(resolve) {
                        require(["/src/temple/software/index.js"], resolve);
                    }
                }, {
                    path: "/timezone",
                    name: "timezone",
                    component: function component(resolve) {
                        require(["/src/temple/timezone/index.js"], resolve);
                    }
                }, {
                    path: "/upgrade",
                    name: "upgrade",
                    component: function component(resolve) {
                        require(["/src/temple/upgrade/index.js"], resolve);
                    }
                }, {
                    path: "/blelist",
                    name: "blelist",
                    component: function component(resolve) {
                        require(["/src/temple/bluetooth/list.js"], resolve);
                    }
                }, {
                    path: "/policy",
                    name: "policy",
                    component: function component(resolve) {
                        require(["/src/temple/policy/index.js"], resolve);
                    }
                },{
                    path: "/gps",
                    name: "gps",
                    component: function component(resolve) {
                        require(["/src/temple/gps/index.js"], resolve);
                    }
                },{
                    path: "/cells",
                    name: "cells",
                    component: function component(resolve) {
                        require(["/src/temple/cells/index.js"], resolve);
                    }
                }, {
                    path: "/ipv6",
                    name: "ipv6",
                    component: function component(resolve) {
                        require(["/src/temple/ipv6/index.js"], resolve);
                    }
                }, {
                    path: "/mcu",
                    name: "mcu",
                    component: function component(resolve) {
                        require(["/src/temple/mcu/index.js"], resolve);
                    }
                }, {
                    path: "/rs485",
                    name: "rs485",
                    component: function component(resolve) {
                        require(["/src/temple/rs485/index.js"], resolve);
                    }
                }, {
                    path: "/sms",
                    name: "sms",
                    component: function component(resolve) {
                        require(["/src/temple/sms/index.js"], resolve);
                    }
                },{
                    path: "/luci",
                    name: "luci",
                    component: function component(resolve) {
                        require(["/src/temple/luci/index.js"], resolve);
                    }
                }]
            }, {
                path: "/login",
                name: "login",
                component: function component(resolve) {
                    require(["/src/temple/login/index.js"], resolve);
                }
            }, {
                path: "/process",
                name: "process",
                component: function component(resolve) {
                    require(["/src/temple/process/index.js"], resolve);
                }
            }, {
                path: "/welcome",
                name: "welcome",
                component: function component(resolve) {
                    require(["/src/temple/welcome/index.js"], resolve);
                }
            },
        ]
    });
    return router;
});
