/*
 * Copyright (C) 2013, 2014 Apple Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS ``AS IS''
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

JSON.LoadError = "JSONLoadError";
JSON.ParseError = "JSONParseError";

var WK = WK || {};

// JSON.load() may be called using the following forms:
//
// JSON.load("http://www.apple.com", function() {/* success */})
// OR
// JSON.load("http://www.apple.com", function() {/* success */}, {withCredentials: true, ...})
// OR
// JSON.load("http://www.apple.com", function() {/* success */}, function() {/* failure */})
// OR
// JSON.load("http://www.apple.com", function() {/* success */}, function() {/* failure */}, {withCredentials: true, ...})
JSON.load = function(url, successCallback, failureCallback, options)
{
    console.assert(url);

    if (!_.isFunction(successCallback))
        return;

    if (!_.isFunction(failureCallback))
        failureCallback = function() { };

    if (!_.isObject(options))
        options = {};

    var request = new XMLHttpRequest;
    request.onreadystatechange = function() {
        if (this.readyState !== 4)
            return;

        // Don't consider a status of 0 to be a load error for easier testing with local files.
        var loadErrorOccurred = this.status !== 0 && this.status !== 200;
        if (loadErrorOccurred) {
            failureCallback({errorType: JSON.LoadError, error: this.statusText, errorHTTPCode: this.status});
            return;
        }

        try {
            var responseText = request.responseText;
            if (_.has(options, "jsonpCallbackName")) {
                // Trim single-line comments and something that looks like a call to 'jsonpCallbackName'.
                responseText = responseText.replace(new RegExp("^\s*//.*\\n", "gm"), '');
                var trimLeading = new RegExp("^" + options.jsonpCallbackName + "\\(");
                var trimTrailing = new RegExp("\\);?\\s*$");
                var leadingMatch = responseText.match(trimLeading);
                var trailingMatch = responseText.match(trimTrailing);
                if (leadingMatch && trailingMatch)
                    responseText = responseText.slice(leadingMatch[0].length, trailingMatch.index);
            }
            var data = JSON.parse(responseText);
        } catch (e) {
            var data = {errorType: JSON.ParseError, error: e.message};
            failureCallback(data);
            return;
        }

        successCallback(data);
    };

    request.open("GET", url);
    if (_.has(options, "withCredentials"))
        request.withCredentials = options.withCredentials;
    request.send();
};

function loadXML(url, callback, options) {
    console.assert(url);

    if (!_.isFunction(callback))
        return;

    var request = new XMLHttpRequest;
    request.onreadystatechange = function() {
        if (this.readyState !== 4)
            return;

        // Allow a status of 0 for easier testing with local files.
        if (!this.status || this.status === 200)
            callback(request.responseXML);
    };

    request.open("GET", url);
    if (_.has(options, "withCredentials"))
        request.withCredentials = options.withCredentials;
    request.send();
};

Node.prototype.isAncestor = function(node)
{
    if (!node)
        return false;

    var currentNode = node.parentNode;
    while (currentNode) {
        if (this === currentNode)
            return true;
        currentNode = currentNode.parentNode;
    }

    return false;
}

Node.prototype.isDescendant = function(descendant)
{
    return !!descendant && descendant.isAncestor(this);
}

Node.prototype.isSelfOrAncestor = function(node)
{
    return !!node && (node === this || this.isAncestor(node));
}

Node.prototype.isSelfOrDescendant = function(node)
{
    return !!node && (node === this || this.isDescendant(node));
}

Object.defineProperty(Node.prototype, "enclosingNodeOrSelfWithClass",
{
    value: function(className)
    {
        for (var node = this; node && node !== this.ownerDocument; node = node.parentNode)
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains(className))
                return node;
        return null;
    }
});

Object.defineProperty(Node.prototype, "enclosingNodeOrSelfWithTagName",
{
    value: function(tagName)
    {
        if (!tagName)
            return null;

        // If the document is XHTML instead of HTML, tag names could be lowercase. Don't risk it.
        tagName = tagName.toUpperCase();

        for (var node = this; node && node !== this.ownerDocument; node = node.parentNode)
            if (node.tagName.toUpperCase() === tagName)
                return node;
        return null;
    }
});

Object.defineProperty(Object, "shallowCopy",
{
    value: function(object)
    {
        // Make a new object and copy all the key/values. The values are not copied.
        var copy = {};
        var keys = Object.keys(object);
        for (var i = 0; i < keys.length; ++i)
            copy[keys[i]] = object[keys[i]];
        return copy;
    }
});

Object.defineProperty(Object, "shallowEqual",
{
    value: function(a, b)
    {
        // Checks if two objects have the same top-level properties.

        // Check for strict equality in case they are the same object.
        if (a === b)
            return true;

        // Only objects can proceed. null is an object, but Object.keys throws for null.
        if (typeof a !== "object" || typeof b !== "object" || a === null || b === null)
            return false;

        var aKeys = Object.keys(a);
        var bKeys = Object.keys(b);

        // Check that each object has the same number of keys.
        if (aKeys.length !== bKeys.length)
            return false;

        // Check if all the keys and their values are equal.
        for (var i = 0; i < aKeys.length; ++i) {
            // Check that b has the same key as a.
            if (!(aKeys[i] in b))
                return false;

            // Check that the values are strict equal since this is only
            // a shallow check, not a recursive one.
            if (a[aKeys[i]] !== b[aKeys[i]])
                return false;
        }

        return true;
    }
});

Element.prototype.removeChildren = function()
{
    // This has been tested to be the fastest removal method.
    if (this.firstChild)
        this.textContent = "";
};

DOMTokenList.prototype.contains = function(string)
{
    for (var i = 0, end = this.length; i < end; ++i) {
        if (this.item(i) === string)
            return true;
    }
    return false;
}

Object.defineProperty(Number, "constrain",
{
    value: function(num, min, max)
    {
        if (num < min)
            num = min;
        else if (num > max)
            num = max;
        return num;
    }
});

Object.defineProperty(Array.prototype, "lastValue",
{
    get: function()
    {
        if (!this.length)
            return undefined;
        return this[this.length - 1];
    }
});

Object.defineProperty(Array.prototype, "remove",
{
    value: function(value, onlyFirst)
    {
        for (var i = this.length - 1; i >= 0; --i) {
            if (this[i] === value) {
                this.splice(i, 1);
                if (onlyFirst)
                    return;
            }
        }
    }
});

Array.prototype.contains = function(value)
{
    return this.indexOf(value) >= 0;
};

Array.prototype.findFirst = function(predicate)
{
    for (var i = 0; i < this.length; ++i) {
        if (predicate(this[i]))
            return this[i];
    }

    return null;
};

Array.prototype.average = function()
{
    var sum = 0;
    var count = this.length;
    for (var i = 0; i < count; ++i)
        sum += this[i];
    return sum / count;
};

Array.prototype.median = function()
{
    var array = this.slice(); // Make a copy to avoid modifying the object.
    array.sort(function(a, b) { return a - b; });

    var half = Math.floor(array.length / 2);

    if (array.length % 2)
        return array[half];
    else
        return (array[half - 1] + array[half]) / 2;
};

String.prototype.contains = function(substring)
{
    return this.indexOf(substring) >= 0;
};

String.prototype.startsWith = function(substring)
{
    return this.lastIndexOf(substring, 0) === 0;
}

WK.UnitBezier = function(x1, y1, x2, y2)
{
    // Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
    this._cx = 3.0 * x1;
    this._bx = 3.0 * (x2 - x1) - this._cx;
    this._ax = 1.0 - this._cx - this._bx;

    this._cy = 3.0 * y1;
    this._by = 3.0 * (y2 - y1) - this._cy;
    this._ay = 1.0 - this._cy - this._by;
}

WK.UnitBezier.prototype = {
    constructor: WK.UnitBezier,

    // Public

    solve: function(x, epsilon)
    {
        return this._sampleCurveY(this._solveCurveX(x, epsilon));
    },

    // Private

    _sampleCurveX: function(t)
    {
        // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
        return ((this._ax * t + this._bx) * t + this._cx) * t;
    },

    _sampleCurveY: function(t)
    {
        return ((this._ay * t + this._by) * t + this._cy) * t;
    },

    _sampleCurveDerivativeX: function(t)
    {
        return (3.0 * this._ax * t + 2.0 * this._bx) * t + this._cx;
    },

    // Given an x value, find a parametric value it came from.
    _solveCurveX: function(x, epsilon)
    {
        var t0, t1, t2, x2, d2, i;

        // First try a few iterations of Newton's method -- normally very fast.
        for (t2 = x, i = 0; i < 8; i++) {
            x2 = this._sampleCurveX(t2) - x;
            if (Math.abs(x2) < epsilon)
                return t2;
            d2 = this._sampleCurveDerivativeX(t2);
            if (Math.abs(d2) < 1e-6)
                break;
            t2 = t2 - x2 / d2;
        }

        // Fall back to the bisection method for reliability.
        t0 = 0.0;
        t1 = 1.0;
        t2 = x;

        if (t2 < t0)
            return t0;
        if (t2 > t1)
            return t1;

        while (t0 < t1) {
            x2 = this._sampleCurveX(t2);
            if (Math.abs(x2 - x) < epsilon)
                return t2;
            if (x > x2)
                t0 = t2;
            else
                t1 = t2;
            t2 = (t1 - t0) * 0.5 + t0;
        }

        // Failure.
        return t2;
    }
};

