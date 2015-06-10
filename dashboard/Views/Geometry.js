/*
 * Copyright (C) 2013 Apple Inc. All rights reserved.
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

WK.Point = function(x, y)
{
    this.x = x || 0;
    this.y = y || 0;
}

WK.Point.prototype = {
    constructor: WK.Point,

    // Public

    toString: function()
    {
        return "WK.Point[" + this.x + "," + this.y + "]";
    },

    copy: function()
    {
        return new WK.Point(this.x, this.y);
    },

    equals: function(anotherPoint)
    {
        return (this.x === anotherPoint.x && this.y === anotherPoint.y);
    }
};

WK.Point.fromEvent = function(event)
{
    return new WK.Point(event.pageX, event.pageY);
}

WK.Size = function(width, height)
{
    this.width = width || 0;
    this.height = height || 0;
}

WK.Size.prototype = {
    constructor: WK.Size,

    // Public

    toString: function()
    {
        return "WK.Size[" + this.width + "," + this.height + "]";
    },

    copy: function()
    {
        return new WK.Size(this.width, this.height);
    },

    equals: function(anotherSize)
    {
        return (this.width === anotherSize.width && this.height === anotherSize.height);
    }
};

WK.Size.ZERO_SIZE = new WK.Size(0, 0);


WK.Rect = function(x, y, width, height) {
    this.origin = new WK.Point(x || 0, y || 0);
    this.size = new WK.Size(width || 0, height || 0);
}


WK.Rect.prototype = {
    constructor: WK.Rect,

    // Public

    toString: function()
    {
        return "WK.Rect[" + [this.origin.x, this.origin.y, this.size.width, this.size.height].join(", ") + "]";
    },

    copy: function()
    {
        return new WK.Rect(this.origin.x, this.origin.y, this.size.width, this.size.height);
    },

    equals: function(anotherRect)
    {
        return (this.origin.equals(anotherRect.origin) && this.size.equals(anotherRect.size));
    },

    inset: function(insets)
    {
        return new WK.Rect(
            this.origin.x + insets.left,
            this.origin.y + insets.top,
            this.size.width - insets.left - insets.right,
            this.size.height - insets.top - insets.bottom
        );
    },

    pad: function(padding)
    {
        return new WK.Rect(
            this.origin.x - padding,
            this.origin.y - padding,
            this.size.width + padding * 2,
            this.size.height + padding * 2
        );
    },

    minX: function()
    {
        return this.origin.x;
    },

    minY: function()
    {
        return this.origin.y;
    },

    midX: function()
    {
        return this.origin.x + (this.size.width / 2);
    },

    midY: function()
    {
        return this.origin.y + (this.size.height / 2);
    },

    maxX: function()
    {
        return this.origin.x + this.size.width;
    },

    maxY: function()
    {
        return this.origin.y + this.size.height;
    },

    intersectionWithRect: function(rect)
    {
        var x1 = Math.max(this.minX(), rect.minX());
        var x2 = Math.min(this.maxX(), rect.maxX());
        if (x1 > x2)
            return WK.Rect.ZERO_RECT;
        var intersection = new WK.Rect;
        intersection.origin.x = x1;
        intersection.size.width = x2 - x1;
        var y1 = Math.max(this.minY(), rect.minY());
        var y2 = Math.min(this.maxY(), rect.maxY());
        if (y1 > y2)
            return WK.Rect.ZERO_RECT;
        intersection.origin.y = y1;
        intersection.size.height = y2 - y1;
        return intersection;
    },

    unionWithRect: function(rect)
    {
        var x = Math.min(this.minX(), rect.minX());
        var y = Math.min(this.minY(), rect.minY());
        var width = Math.max(this.maxX(), rect.maxX()) - x;
        var height = Math.max(this.maxY(), rect.maxY()) - y;
        return new WK.Rect(x, y, width, height);
    },

    round: function()
    {
        return new WK.Rect(
            Math.floor(this.origin.x),
            Math.floor(this.origin.y),
            Math.ceil(this.size.width),
            Math.ceil(this.size.height)
        );
    }
};

WK.Rect.rectFromClientRect = function(clientRect)
{
    return new WK.Rect(clientRect.left, clientRect.top, clientRect.width, clientRect.height);
},

WK.Rect.unionOfRects = function(rects)
{
    var union = rects[0];
    for (var i = 1; i < rects.length; ++i)
        union = union.unionWithRect(rects[i]);
    return union;
},

WK.Rect.ZERO_RECT = new WK.Rect(0, 0, 0, 0);

WK.EdgeInsets = function(top, right, bottom, left)
{
    console.assert(arguments.length === 1 || arguments.length === 4);

    if (arguments.length === 1) {
        this.top = top;
        this.right = top;
        this.bottom = top;
        this.left = top;
    } else if (arguments.length === 4) {
        this.top = top;
        this.right = right;
        this.bottom = bottom;
        this.left = left;
    }
}

WK.EdgeInsets.prototype = {
    constructor: WK.EdgeInsets,

    // Public

    equals: function(anotherInset)
    {
        return (this.top === anotherInset.top && this.right === anotherInset.right &&
                this.bottom === anotherInset.bottom && this.left === anotherInset.left);
    },

    copy: function()
    {
        return new WK.EdgeInsets(this.top, this.right, this.bottom, this.left);
    }
};

WK.RectEdge = {
    MIN_X : 0,
    MIN_Y : 1,
    MAX_X : 2,
    MAX_Y : 3
};
