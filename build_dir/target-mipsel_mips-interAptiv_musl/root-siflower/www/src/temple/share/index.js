"use strict";

define([
  "text!temple/share/index.html",
  "css!temple/share/index.css",
  "vue",
  "component/gl-toggle-btn/index",
  "component/gl-tooltip/index",
  "component/gl-btn/index",
  "component/gl-select/index",
  'component/modal/modal',
], function (stpl, css, Vue, gl_switch, gl_tooltip, gl_btn, gl_select,gl_modal,gl_loading) {
  var vueComponent = Vue.extend({
    template: stpl,
    data: function data() {
      return {
        isShow: false,
        agreeStatus: false,
        applyStatus: true,
        msgOf_dmz: false,
        // dlna
        applyDlnaStatus: true, //是否禁用(true为禁用)
        currentDlnaDir: null,
        flagDlna: "",
        enableDlna: false,
        // samba
        flag: "", //第一次进入页面用于阻止应用按钮开启
        currentDir: null,
        dlnaInstallStatus: false,
        spinnerStatus: "",
        flash_free: 0,
        flash_total: 0,

        showModal:false,
        msgModal:false,
        errMsg:'',
        putMsg:'',
        softName:'',
        status:'',
        updateStatus: false,
        uploadDistinguish:'',
        uploadStatus:'',
      };
    },
    components: {
      "gl-switch": gl_switch,
      "gl-tooltip": gl_tooltip,
      "gl-btn": gl_btn,
      "gl-select": gl_select,
      "gl-modal": gl_modal,
    },
    beforeRouteEnter: function beforeRouteEnter(to, from, next) {
      next(function (vm) {
        $("#router-visual").slideUp();
        setTimeout(function () {
          if ($(".clsLink2" + vm.$route.path.split("/")[1]).hasClass("bar")) {
            $(".bar.active").removeClass("active");
            $(".clsLink2" + vm.$route.path.split("/")[1]).addClass("active");
            $("#vpn").collapse("hide");
            $("#moresetting").collapse("hide");
            $("#applications").collapse("hide");
            $("#system").collapse("show");
          }
        }, 50);
      });
    },
    beforeRouteLeave: function beforeRouteLeave(to, from, next) {
      if (this.dlnaInstallStatus && this.updateStatus) {
        this.$message({
          type: "info",
          msg: -1900,
          duration: 2000,
        });
      } else {
        next();
      }
    },
    mounted: function mounted() {
      var that = this;
      this.$store.dispatch("call", {
        api: "uploadStatus",
      }).then(function (res) {
        if (res.success) {
          that.uploadStatus=res.updated;
        }  
      });
      this.$store.dispatch("call", {
        api: "shareget",
      });
      this.$store.dispatch("call", {
        api: "getdlna",
      });
      this.$store.dispatch("call", {
        api: "getapplist",
      });
      that.getRouerMini();
      that.$store
        .dispatch("call", {
          api: "fwget",
        })
        .then(function (result) {
          if (result.status == "Enabled") {
            that.msgOf_dmz = true;
          }
        });
        
    },
    computed: {
      shareget: function shareget() {
        var curList = this.$store.getters.apiData["shareget"];
        this.flag = curList.share_dir;
        this.currentDir = curList.share_dir;
        return this.$store.getters.apiData["shareget"];
      },
      dlnaget: function dlnaget() {
        var curList = this.$store.getters.apiData["getdlna"];
        this.flagDlna = curList.current;
        this.currentDlnaDir = curList.current;
        this.enableDlna = curList.enabled;
        return this.$store.getters.apiData["getdlna"];
      },
      router: function router() {
        return this.$store.getters.apiData["router_mini"];
      },
      getapplist: function getapplist() {
        return this.$store.getters.apiData["getapplist"];
      },
      isSharing: function isSharing() {
        var list = this.getapplist.applist || [];
        for (var i = 0; i < list.length; i++) {
          if (list[i] == "FileSharing") {
            return true;
          }
        }
        return false;
      },
      isDlna: function isDlna() {
        var list = this.getapplist.applist || [];
        for (var i = 0; i < list.length; i++) {
          if (list[i] == "DLNA") {
            return true;
          }
        }
        return false;
      },
      splitString: function splitString() {
        if (this.flash_free.toString().length >= 4) {
            var int = this.flash_free.toString().indexOf('.') + 2;
            this.flash_free = this.flash_free.toString().slice(0,int);
            return this.flash_free;
        };
        return this.flash_free;
    },
    },
    methods: {
      // 安装
      installApp: function installApp(value) {
     
        var that = this;
        this.spinnerStatus = value == "dlna" ? "dlna" : "sharing";
        this.dlnaInstallStatus = true;
        this.updateStatus=true;
        this.softName = value;
        var data = { name: value };
        that.$store
          .dispatch("call", {
            api: "app_install",
            timeOut: 300000,
            data: data,
          })
          .then(function (result) {
            that.dlnaInstallStatus = false;
            that.updateStatus=false;
            that.putMsg = result.stdout;
            that.msgModal = true;
            if (result.success) {
              that.status = "successfully"
              that.$store.dispatch("call", {
                api: "getapplist",
              });
              that.getRouerMini();
              setTimeout(function() {
                that.$store.dispatch("call", {
                  api: "shareget",
                });
              }, 2000);
            } else {
              that.status = "failed";
              that.errMsg = result.stderr;
              if (result.code == -32 ||result.code == -12||result.code == -13||result.code == -111||result.code == -24) {
                that.errMsg = result.msg;
              }
            }
          });
      },
      getRouerMini: function getRouerMini() {
        var that = this;
        this.$store.dispatch("call", {
          api: "router_mini",
        })
          .then(function (result) {
            if (result.flash_total != 0) {
              that.flash_free =
                result.flash.flash_free / result.flash.flash_total;
              that.flash_free = that.flash_free.toFixed(2) * 100;
              that.flash_total = Math.floor(
                result.flash.flash_free / 1024
              );
            } else {
              that.flash_total = "0";
              that.flash_free = "0";
            }
          });
      },
      checkApply: function checkApply() {
        this.applyStatus = false;
      },
      checkArgee: function checkArgee() {
        var that = this;
        if (this.shareget.samba_writable) {
          that.$store.commit("showModal", {
            show: true,
            title: "Caution",
            type: "warning",
            message: this.$lang.modal.usbUseInfo,
            yes: "Agree",
            no: "Cancel",
            cb: function cb() {
              that.applyStatus = false;
            },
            cancel: function cancel() {
              that.shareget.samba_writable = false;
            },
          });
        } else {
          that.applyStatus = false;
        }
      },
      // 改变目录
      changeCurDir: function changeSambaDir(type) {
        if (type == "dlna" && this.currentDlnaDir != this.flagDlna) {
          this.applyDlnaStatus = false;
        } else if (type == "damb" && this.currentDir != this.flag) {
          this.applyStatus = false;
        }
      },
      // 输入目录
      curInputDir: function inputSambaDir(type) {
        if (type == "dlna") {
          this.applyDlnaStatus = false;
        } else if (type == "samb") {
          this.applyStatus = false;
        }
      },
      setShare: function setShare() {
        var that = this;
        that.applyStatus = true;
        this.$store
          .dispatch("call", {
            api: "shareset",
            data: {
              path: that.currentDir,
              lan_share: that.shareget.share_on_lan,
              wan_share: that.shareget.share_on_wan,
              writable: that.shareget.samba_writable,
            },
          })
          .then(function (result) {
            if (result.success) {
              that.$message({
                type: "success",
                msg: result.code,
              });
            } else {
              that.$message({
                type: "error",
                msg: result.code,
              });
            }
          });
      },
      // set DLNA
      setDLNA: function setDLNA() {
        var that = this;
        that.$store
          .dispatch("call", {
            api: "setdlna",
            data: {
              enabled: that.enableDlna,
              current: that.currentDlnaDir,
            },
          })
          .then(function (result) {
            if (result.success) {
              that.$message({
                type: "success",
                msg: result.code,
              });
            } else {
              that.$message({
                type: "error",
                msg: result.code,
              });
            }
            that.applyDlnaStatus = true;
          });
      },
      checkDlnaApply: function checkDlnaApply() {
        this.applyDlnaStatus = false;
      },
       // 清空详情框
       closeModal: function closeModal() {
        this.showModal = false;
        this.msgModal = false;
        this.errMsg = '';
        this.putMsg = '';
        this.status = '';
        this.softName = '';
    },
    // 更新数据
    updateSortWare: function updateSortWare(name) {
      var that = this;
      that.dlnaInstallStatus = true
      that.updateStatus = true;
      this.uploadDistinguish= name=="filesharing" ? 'sharing' : 'dlna'
      this.$store.dispatch("call", {
          api: "updatesofeware",
          timeOut: 60000
      }).then(function (result) {
          that.dlnaInstallStatus = false;
          that.updateStatus = false;
          that.uploadDistinguish='';
          if (result.failed) {
              that.$message({
                  "type": "error",
                  "api": "updatesoftware",
                  "msg": result.code
              });
              return;
          }
          if (result.success) {
              that.uploadStatus=true;
              that.getAllSorftWare();
          } else {
              that.$message({
                  "type": "error",
                  "api": "updatesofeware",
                  "msg": result.code
              });
          }
      });
     },
     // 获取所有包状态
     getAllSorftWare: function getAllSorftWare() {
       var that=this;
      this.$store.dispatch("call", {
        api: "software",
        timeOut: 30000
      }).then(function (result) {
        if (result.success) {
          that.$message({
            "type": "success",
            "msg": result.code
         });
        } else {
          that.$message({
            "type": "error",
            "msg": result.code
         });
        }
      })
     }
    },
  });
  return vueComponent;
});

