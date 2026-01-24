"use strict";
/**
 * DoNotDisturb- core: notification routing backbone.
 * Public API. No vscode or external dependencies.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.route = exports.defaultMatchConditions = exports.containsMatches = exports.sourceMatches = void 0;
var matchers_js_1 = require("./matchers.js");
Object.defineProperty(exports, "sourceMatches", { enumerable: true, get: function () { return matchers_js_1.sourceMatches; } });
Object.defineProperty(exports, "containsMatches", { enumerable: true, get: function () { return matchers_js_1.containsMatches; } });
Object.defineProperty(exports, "defaultMatchConditions", { enumerable: true, get: function () { return matchers_js_1.defaultMatchConditions; } });
var router_js_1 = require("./router.js");
Object.defineProperty(exports, "route", { enumerable: true, get: function () { return router_js_1.route; } });
//# sourceMappingURL=index.js.map