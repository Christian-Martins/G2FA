// Copyright (C) 2012 Gerard Braad
!(function (exports) {
    "use strict";
    var StorageService = function () {
        var setObject = function (key, value) {
                localStorage.setItem(key, JSON.stringify(value));
            },
            getObject = function (key) {
                var value = localStorage.getItem(key);
                return value && JSON.parse(value);
            };
        return {
            isSupported: function () {
                return "undefined" != typeof Storage;
            },
            getObject: getObject,
            setObject: setObject,
        };
    };
    exports.StorageService = StorageService;
    var KeyUtilities = function (jsSHA) {
        var dec2hex = function (s) {
                return (s < 15.5 ? "0" : "") + Math.round(s).toString(16);
            },
            hex2dec = function (s) {
                return parseInt(s, 16);
            },
            base32tohex = function (base32) {
                for (var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", bits = "", hex = "", i = 0; i < base32.length; i++) {
                    var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
                    bits += leftpad(val.toString(2), 5, "0");
                }
                for (i = 0; i + 4 <= bits.length; i += 4) {
                    var chunk = bits.substr(i, 4);
                    hex += parseInt(chunk, 2).toString(16);
                }
                return hex;
            },
            leftpad = function (str, len, pad) {
                return len + 1 >= str.length && (str = new Array(len + 1 - str.length).join(pad) + str), str;
            };
        return {
            generate: function (secret, epoch) {
                var key = base32tohex(secret);
                key.length % 2 != 0 && (key += "0"), void 0 === epoch && (epoch = Math.round(new Date().getTime() / 1e3));
                var time = leftpad(dec2hex(Math.floor(epoch / 30)), 16, "0"),
                    hmacObj = new jsSHA(time, "HEX"),
                    hmac = hmacObj.getHMAC(key, "HEX", "SHA-1", "HEX"),
                    offset = 0;
                "KEY MUST BE IN BYTE INCREMENTS" !== hmac && (offset = hex2dec(hmac.substring(hmac.length - 1)));
                var otp = (hex2dec(hmac.substr(2 * offset, 8)) & hex2dec("7fffffff")) + "";
                return otp.substr(otp.length - 6, 6).toString();
            },
        };
    };
    exports.KeyUtilities = KeyUtilities;
    var KeysController = function () {
        var storageService = null,
            keyUtilities = null,
            editingEnabled = !1,
            init = function () {
                (storageService = new StorageService()),
                    (keyUtilities = new KeyUtilities(jsSHA)),
                    storageService.isSupported()
                        ? (storageService.getObject("accounts") || addAccount("alice@google.com", "JBSWY3DPEHPK3PXP"), updateKeys(), setInterval(timerTick, 1e3))
                        : ($("#updatingIn").text("x"), $("#accountsHeader").text("No Storage support")),
                    $("#addKeyButton").click(function () {
                        var name = $("#keyAccount").val(),
                            secret = $("#keySecret").val();
                        (secret = secret.replace(/ /g, "")), "" !== secret ? (addAccount(name, secret), clearAddFields(), $.mobile.navigate("#main")) : $("#keySecret").focus();
                    }),
                    $("#addKeyCancel").click(function () {
                        clearAddFields();
                    });
                var clearAddFields = function () {
                    $("#keyAccount").val(""), $("#keySecret").val("");
                };
                $("#edit").click(function () {
                    toggleEdit();
                }),
                    $("#export").click(function () {
                        exportAccounts();
                    });
            },
            updateKeys = function () {
                var accountList = $("#accounts");
                accountList.find("li:gt(0)").remove(),
                    $.each(storageService.getObject("accounts"), function (index, account) {
                        var key = keyUtilities.generate(account.secret),
                            detLink = $("<h3>" + key + "</h3><p>" + account.name + "</p>"),
                            accElem = $('<li data-icon="false">').append(detLink);
                        if (editingEnabled) {
                            var delLink = $('<p class="ui-li-aside"><a class="ui-btn-icon-notext ui-icon-delete" href="#"></a></p>');
                            delLink.click(function () {
                                deleteAccount(index);
                            }),
                                accElem.append(delLink);
                        }
                        accountList.append(accElem);
                    }),
                    accountList.listview().listview("refresh");
            },
            toggleEdit = function () {
                (editingEnabled = !editingEnabled), editingEnabled ? $("#addButton").show() : $("#addButton").hide(), updateKeys();
            },
            exportAccounts = function () {
                var accounts = JSON.stringify(storageService.getObject("accounts")),
                    blob = new Blob([accounts], { type: "text/plain;charset=utf-8" });
                saveAs(blob, "gauth-export.json");
            },
            deleteAccount = function (index) {
                var accounts = storageService.getObject("accounts");
                accounts.splice(index, 1), storageService.setObject("accounts", accounts), updateKeys();
            },
            addAccount = function (name, secret) {
                if ("" === secret) return !1;
                var account = { name: name, secret: secret },
                    accounts = storageService.getObject("accounts");
                return accounts || (accounts = []), accounts.push(account), storageService.setObject("accounts", accounts), updateKeys(), !0;
            },
            timerTick = function () {
                var epoch = Math.round(new Date().getTime() / 1e3),
                    countDown = 30 - (epoch % 30);
                epoch % 30 == 0 && updateKeys(), $("#updatingIn").text(countDown);
            };
        return { init: init, addAccount: addAccount, deleteAccount: deleteAccount };
    };
    exports.KeysController = KeysController;
})("undefined" == typeof exports ? (this.gauth = {}) : exports);
