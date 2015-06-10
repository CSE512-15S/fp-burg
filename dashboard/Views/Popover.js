/*
 * Copyright (C) 2013, 2015 Apple Inc. All rights reserved.
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

WK.Popover = function(delegate)
{
    WK.Object.call(this);

    this.delegate = delegate;
    this._edge = null;
    this._frame = new WK.Rect;
    this._content = null;
    this._targetFrame = new WK.Rect;
    this._anchorPoint = new WK.Point;
    this._preferredEdges = null;

    this._contentNeedsUpdate = false;

    this._element = document.createElement("div");
    this._element.className = "popover";
    this._canvasId = "popover-" + (WK.Popover.canvasId++);
    this._element.style.backgroundImage = "-webkit-canvas(" + this._canvasId + ")";
    this._element.addEventListener("transitionend", this, true);

    this._container = this._element.appendChild(document.createElement("div"));
    this._container.className = "container";
}

WK.Popover.prototype = {
    constructor: WK.Popover,
    __proto__: WK.Object.prototype,

    // Public

    get element()
    {
        return this._element;
    },

    get frame()
    {
        return this._frame;
    },

    get visible()
    {
        return this._element.parentNode === document.body && !this._element.classList.contains(WK.Popover.FadeOutClassName);
    },

    set frame(frame)
    {
        this._element.style.left = frame.minX() + "px";
        this._element.style.top = frame.minY() + "px";
        this._element.style.width = frame.size.width + "px";
        this._element.style.height = frame.size.height + "px";
        this._element.style.backgroundSize = frame.size.width + "px " + frame.size.height + "px";
        this._frame = frame;
    },

    set content(content)
    {
        if (content === this._content)
            return;

        this._content = content;

        this._contentNeedsUpdate = true;

        if (this.visible)
            this._update(true);
    },

    update: function()
    {
        if (!this.visible)
            return;

        var previouslyFocusedElement = document.activeElement;

        this._contentNeedsUpdate = true;
        this._update(true);

        if (previouslyFocusedElement)
            previouslyFocusedElement.focus();
    },

    present: function(targetFrame, preferredEdges)
    {
        this._targetFrame = targetFrame;
        this._preferredEdges = preferredEdges;

        if (!this._content)
            return;

        this._addListenersIfNeeded();

        this._update();
    },

    presentNewContentWithFrame: function(content, targetFrame, preferredEdges)
    {
        this._content = content;
        this._contentNeedsUpdate = true;

        this._targetFrame = targetFrame;
        this._preferredEdges = preferredEdges;

        this._addListenersIfNeeded();

        var shouldAnimate = this.visible;
        this._update(shouldAnimate);
    },

    dismiss: function()
    {
        if (this._element.parentNode !== document.body)
            return;

        console.assert(this._isListeningForPopoverEvents);
        this._isListeningForPopoverEvents = false;
        window.removeEventListener("mousedown", this, true);
        window.removeEventListener("scroll", this, true);

        this._element.classList.add(WK.Popover.FadeOutClassName);

        if (this.delegate && typeof this.delegate.willDismissPopover === "function")
            this.delegate.willDismissPopover(this);
    },

    handleEvent: function(event)
    {
        switch (event.type) {
        case "mousedown":
        case "scroll":
            if (!this._element.contains(event.target))
                this.dismiss();
            break;
        case "transitionend":
            if (event.target === this._element) {
                document.body.removeChild(this._element);
                this._element.classList.remove(WK.Popover.FadeOutClassName);
                this._container.textContent = "";
                if (this.delegate && typeof this.delegate.didDismissPopover === "function")
                    this.delegate.didDismissPopover(this);
                break;
            }
        }
    },

    // Private

    _update: function(shouldAnimate)
    {
        if (shouldAnimate)
            var previousEdge = this._edge;

        var targetFrame = this._targetFrame;
        var preferredEdges = this._preferredEdges;

        // Ensure our element is on display so that its metrics can be resolved
        // or interrupt any pending transition to remove it from display.
        if (this._element.parentNode !== document.body)
            document.body.appendChild(this._element);
        else
            this._element.classList.remove(WK.Popover.FadeOutClassName);

        if (this._contentNeedsUpdate) {
            // Reset CSS properties on element so that the element may be sized to fit its content.
            this._element.style.removeProperty("left");
            this._element.style.removeProperty("top");
            this._element.style.removeProperty("width");
            this._element.style.removeProperty("height");
            if (this._edge !== null)
                this._element.classList.remove(this._cssClassNameForEdge());

            // Add the content in place of the wrapper to get the raw metrics.
            this._element.replaceChild(this._content, this._container);

            // Get the ideal size for the popover to fit its content.
            var popoverBounds = this._element.getBoundingClientRect();
            this._preferredSize = new WK.Size(Math.ceil(popoverBounds.width), Math.ceil(popoverBounds.height));
        }

        var titleBarOffset = 0; // WK.Platform.name === "mac" && WK.Platform.version.release >= 10 ? 22 : 0;
        var containerFrame = new WK.Rect(0, titleBarOffset, window.innerWidth, window.innerHeight - titleBarOffset);
        // The frame of the window with a little inset to make sure we have room for shadows.
        containerFrame = containerFrame.inset(WK.Popover.ShadowEdgeInsets);

        // Work out the metrics for all edges.
        var metrics = new Array(preferredEdges.length);
        for (var edgeName in WK.RectEdge) {
            var edge = WK.RectEdge[edgeName];
            var item = {
                edge,
                metrics: this._bestMetricsForEdge(this._preferredSize, targetFrame, containerFrame, edge)
            };
            var preferredIndex = preferredEdges.indexOf(edge);
            if (preferredIndex !== -1)
                metrics[preferredIndex] = item;
            else
                metrics.push(item);
        }

        function area(size)
        {
            return size.width * size.height;
        }

        // Find if any of those fit better than the frame for the preferred edge.
        var bestEdge = metrics[0].edge;
        var bestMetrics = metrics[0].metrics;
        for (var i = 1; i < metrics.length; i++) {
            var itemMetrics = metrics[i].metrics;
            if (area(itemMetrics.contentSize) > area(bestMetrics.contentSize)) {
                bestEdge = metrics[i].edge;
                bestMetrics = itemMetrics;
            }
        }

        var anchorPoint;
        var bestFrame = bestMetrics.frame.round();

        this._edge = bestEdge;

        if (bestFrame === WK.Rect.ZERO_RECT) {
            // The target for the popover is offscreen.
            this.dismiss();
        } else {
            switch (bestEdge) {
            case WK.RectEdge.MIN_X: // Displayed on the left of the target, arrow points right.
                anchorPoint = new WK.Point(bestFrame.size.width - WK.Popover.ShadowPadding, targetFrame.midY() - bestFrame.minY());
                break;
            case WK.RectEdge.MAX_X: // Displayed on the right of the target, arrow points left.
                anchorPoint = new WK.Point(WK.Popover.ShadowPadding, targetFrame.midY() - bestFrame.minY());
                break;
            case WK.RectEdge.MIN_Y: // Displayed above the target, arrow points down.
                anchorPoint = new WK.Point(targetFrame.midX() - bestFrame.minX(), bestFrame.size.height - WK.Popover.ShadowPadding);
                break;
            case WK.RectEdge.MAX_Y: // Displayed below the target, arrow points up.
                anchorPoint = new WK.Point(targetFrame.midX() - bestFrame.minX(), WK.Popover.ShadowPadding);
                break;
            }

            this._element.classList.add(this._cssClassNameForEdge());

            if (shouldAnimate && this._edge === previousEdge)
                this._animateFrame(bestFrame, anchorPoint);
            else {
                 this.frame = bestFrame;
                 this._setAnchorPoint(anchorPoint);
                 this._drawBackground();
            }

            // Make sure content is centered in case either of the dimension is smaller than the minimal bounds.
            if (this._preferredSize.width < WK.Popover.MinWidth || this._preferredSize.height < WK.Popover.MinHeight)
                this._container.classList.add("center");
            else
                this._container.classList.remove("center");
        }

        // Wrap the content in the container so that it's located correctly.
        if (this._contentNeedsUpdate) {
            this._container.textContent = "";
            this._element.replaceChild(this._container, this._content);
            this._container.appendChild(this._content);
        }

        this._contentNeedsUpdate = false;
    },

    _cssClassNameForEdge: function()
    {
        switch (this._edge) {
        case WK.RectEdge.MIN_X: // Displayed on the left of the target, arrow points right.
            return "arrow-right";
        case WK.RectEdge.MAX_X: // Displayed on the right of the target, arrow points left.
            return "arrow-left";
        case WK.RectEdge.MIN_Y: // Displayed above the target, arrow points down.
            return "arrow-down";
        case WK.RectEdge.MAX_Y: // Displayed below the target, arrow points up.
            return "arrow-up";
        }
        console.error("Unknown edge.");
        return "arrow-up";
    },

    _setAnchorPoint: function(anchorPoint)
    {
        anchorPoint.x = Math.floor(anchorPoint.x);
        anchorPoint.y = Math.floor(anchorPoint.y);
        this._anchorPoint = anchorPoint;
    },

    _animateFrame: function(toFrame, toAnchor)
    {
        var startTime = Date.now();
        var duration = 350;
        var epsilon = 1 / (200 * duration);
        var spline = new WK.UnitBezier(0.25, 0.1, 0.25, 1);

        var fromFrame = this._frame.copy();
        var fromAnchor = this._anchorPoint.copy();

        function animatedValue(from, to, progress)
        {
            return from + (to - from) * progress;
        }

        function drawBackground()
        {
            var progress = spline.solve(Math.min((Date.now() - startTime) / duration, 1), epsilon);

            this.frame = new WK.Rect(
                animatedValue(fromFrame.minX(), toFrame.minX(), progress),
                animatedValue(fromFrame.minY(), toFrame.minY(), progress),
                animatedValue(fromFrame.size.width, toFrame.size.width, progress),
                animatedValue(fromFrame.size.height, toFrame.size.height, progress)
            ).round();

            this._setAnchorPoint(new WK.Point(
                animatedValue(fromAnchor.x, toAnchor.x, progress),
                animatedValue(fromAnchor.y, toAnchor.y, progress)
            ));

            this._drawBackground();

            if (progress < 1)
                requestAnimationFrame(drawBackground.bind(this));
        }

        drawBackground.call(this);
    },

    _drawBackground: function()
    {
        var scaleFactor = window.devicePixelRatio;

        var width = this._frame.size.width;
        var height = this._frame.size.height;
        var scaledWidth = width * scaleFactor;
        var scaledHeight = height * scaleFactor;

        // Create a scratch canvas so we can draw the popover that will later be drawn into
        // the final context with a shadow.
        var scratchCanvas = document.createElement("canvas");
        scratchCanvas.width = scaledWidth;
        scratchCanvas.height = scaledHeight;

        var ctx = scratchCanvas.getContext("2d");
        ctx.scale(scaleFactor, scaleFactor);

        // Bounds of the path don't take into account the arrow, but really only the tight bounding box
        // of the content contained within the frame.
        var bounds;
        var arrowHeight = WK.Popover.AnchorSize.height;
        switch (this._edge) {
        case WK.RectEdge.MIN_X: // Displayed on the left of the target, arrow points right.
            bounds = new WK.Rect(0, 0, width - arrowHeight, height);
            break;
        case WK.RectEdge.MAX_X: // Displayed on the right of the target, arrow points left.
            bounds = new WK.Rect(arrowHeight, 0, width - arrowHeight, height);
            break;
        case WK.RectEdge.MIN_Y: // Displayed above the target, arrow points down.
            bounds = new WK.Rect(0, 0, width, height - arrowHeight);
            break;
        case WK.RectEdge.MAX_Y: // Displayed below the target, arrow points up.
            bounds = new WK.Rect(0, arrowHeight, width, height - arrowHeight);
            break;
        }

        bounds = bounds.inset(WK.Popover.ShadowEdgeInsets);

        // Clip the frame.
        ctx.fillStyle = "black";
        this._drawFrame(ctx, bounds, this._edge, this._anchorPoint);
        ctx.clip();

        // Gradient fill, top-to-bottom.
        var fillGradient = ctx.createLinearGradient(0, 0, 0, height);
        fillGradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        fillGradient.addColorStop(1, "rgba(235, 235, 235, 0.95)");
        ctx.fillStyle = fillGradient;
        ctx.fillRect(0, 0, width, height);

        // Stroke.
        ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
        ctx.lineWidth = 2;
        this._drawFrame(ctx, bounds, this._edge, this._anchorPoint);
        ctx.stroke();

        // Draw the popover into the final context with a drop shadow.
        var finalContext = document.getCSSCanvasContext("2d", this._canvasId, scaledWidth, scaledHeight);

        finalContext.clearRect(0, 0, scaledWidth, scaledHeight);

        finalContext.shadowOffsetX = 1;
        finalContext.shadowOffsetY = 1;
        finalContext.shadowBlur = 5;
        finalContext.shadowColor = "rgba(0, 0, 0, 0.5)";

        finalContext.drawImage(scratchCanvas, 0, 0, scaledWidth, scaledHeight);
    },

    _bestMetricsForEdge: function(preferredSize, targetFrame, containerFrame, edge)
    {
        var x, y;
        var width = preferredSize.width + (WK.Popover.ShadowPadding * 2) + (WK.Popover.ContentPadding * 2);
        var height = preferredSize.height + (WK.Popover.ShadowPadding * 2) + (WK.Popover.ContentPadding * 2);
        var arrowLength = WK.Popover.AnchorSize.height;

        switch (edge) {
        case WK.RectEdge.MIN_X: // Displayed on the left of the target, arrow points right.
            width += arrowLength;
            x = targetFrame.origin.x - width + WK.Popover.ShadowPadding;
            y = targetFrame.origin.y - (height - targetFrame.size.height) / 2;
            break;
        case WK.RectEdge.MAX_X: // Displayed on the right of the target, arrow points left.
            width += arrowLength;
            x = targetFrame.origin.x + targetFrame.size.width - WK.Popover.ShadowPadding;
            y = targetFrame.origin.y - (height - targetFrame.size.height) / 2;
            break;
        case WK.RectEdge.MIN_Y: // Displayed above the target, arrow points down.
            height += arrowLength;
            x = targetFrame.origin.x - (width - targetFrame.size.width) / 2;
            y = targetFrame.origin.y - height + WK.Popover.ShadowPadding;
            break;
        case WK.RectEdge.MAX_Y: // Displayed below the target, arrow points up.
            height += arrowLength;
            x = targetFrame.origin.x - (width - targetFrame.size.width) / 2;
            y = targetFrame.origin.y + targetFrame.size.height - WK.Popover.ShadowPadding;
            break;
        }

        if (edge === WK.RectEdge.MIN_X || edge === WK.RectEdge.MAX_X) {
            if (y < containerFrame.minY())
                y = containerFrame.minY();
            if (y + height > containerFrame.maxY())
                y = containerFrame.maxY() - height;
        } else {
            if (x < containerFrame.minX())
                x = containerFrame.minX();
            if (x + width > containerFrame.maxX())
                x = containerFrame.maxX() - width;
        }

        var preferredFrame = new WK.Rect(x, y, width, height);
        var bestFrame = preferredFrame.intersectionWithRect(containerFrame);

        width = bestFrame.size.width - (WK.Popover.ShadowPadding * 2);
        height = bestFrame.size.height - (WK.Popover.ShadowPadding * 2);

        switch (edge) {
        case WK.RectEdge.MIN_X: // Displayed on the left of the target, arrow points right.
        case WK.RectEdge.MAX_X: // Displayed on the right of the target, arrow points left.
            width -= arrowLength;
            break;
        case WK.RectEdge.MIN_Y: // Displayed above the target, arrow points down.
        case WK.RectEdge.MAX_Y: // Displayed below the target, arrow points up.
            height -= arrowLength;
            break;
        }

        return {
            frame: bestFrame,
            contentSize: new WK.Size(width, height)
        };
    },

    _drawFrame: function(ctx, bounds, anchorEdge)
    {
        var r = WK.Popover.CornerRadius;
        var arrowHalfLength = WK.Popover.AnchorSize.width / 2;
        var anchorPoint = this._anchorPoint;

        ctx.beginPath();
        switch (anchorEdge) {
        case WK.RectEdge.MIN_X: // Displayed on the left of the target, arrow points right.
            ctx.moveTo(bounds.maxX(), bounds.minY() + r);
            ctx.lineTo(bounds.maxX(), anchorPoint.y - arrowHalfLength);
            ctx.lineTo(anchorPoint.x, anchorPoint.y);
            ctx.lineTo(bounds.maxX(), anchorPoint.y + arrowHalfLength);
            ctx.arcTo(bounds.maxX(), bounds.maxY(), bounds.minX(), bounds.maxY(), r);
            ctx.arcTo(bounds.minX(), bounds.maxY(), bounds.minX(), bounds.minY(), r);
            ctx.arcTo(bounds.minX(), bounds.minY(), bounds.maxX(), bounds.minY(), r);
            ctx.arcTo(bounds.maxX(), bounds.minY(), bounds.maxX(), bounds.maxY(), r);
            break;
        case WK.RectEdge.MAX_X: // Displayed on the right of the target, arrow points left.
            ctx.moveTo(bounds.minX(), bounds.maxY() - r);
            ctx.lineTo(bounds.minX(), anchorPoint.y + arrowHalfLength);
            ctx.lineTo(anchorPoint.x, anchorPoint.y);
            ctx.lineTo(bounds.minX(), anchorPoint.y - arrowHalfLength);
            ctx.arcTo(bounds.minX(), bounds.minY(), bounds.maxX(), bounds.minY(), r);
            ctx.arcTo(bounds.maxX(), bounds.minY(), bounds.maxX(), bounds.maxY(), r);
            ctx.arcTo(bounds.maxX(), bounds.maxY(), bounds.minX(), bounds.maxY(), r);
            ctx.arcTo(bounds.minX(), bounds.maxY(), bounds.minX(), bounds.minY(), r);
            break;
        case WK.RectEdge.MIN_Y: // Displayed above the target, arrow points down.
            ctx.moveTo(bounds.maxX() - r, bounds.maxY());
            ctx.lineTo(anchorPoint.x + arrowHalfLength, bounds.maxY());
            ctx.lineTo(anchorPoint.x, anchorPoint.y);
            ctx.lineTo(anchorPoint.x - arrowHalfLength, bounds.maxY());
            ctx.arcTo(bounds.minX(), bounds.maxY(), bounds.minX(), bounds.minY(), r);
            ctx.arcTo(bounds.minX(), bounds.minY(), bounds.maxX(), bounds.minY(), r);
            ctx.arcTo(bounds.maxX(), bounds.minY(), bounds.maxX(), bounds.maxY(), r);
            ctx.arcTo(bounds.maxX(), bounds.maxY(), bounds.minX(), bounds.maxY(), r);
            break;
        case WK.RectEdge.MAX_Y: // Displayed below the target, arrow points up.
            ctx.moveTo(bounds.minX() + r, bounds.minY());
            ctx.lineTo(anchorPoint.x - arrowHalfLength, bounds.minY());
            ctx.lineTo(anchorPoint.x, anchorPoint.y);
            ctx.lineTo(anchorPoint.x + arrowHalfLength, bounds.minY());
            ctx.arcTo(bounds.maxX(), bounds.minY(), bounds.maxX(), bounds.maxY(), r);
            ctx.arcTo(bounds.maxX(), bounds.maxY(), bounds.minX(), bounds.maxY(), r);
            ctx.arcTo(bounds.minX(), bounds.maxY(), bounds.minX(), bounds.minY(), r);
            ctx.arcTo(bounds.minX(), bounds.minY(), bounds.maxX(), bounds.minY(), r);
            break;
        }
        ctx.closePath();
    },

    _addListenersIfNeeded: function()
    {
        if (!this._isListeningForPopoverEvents) {
            this._isListeningForPopoverEvents = true;
            window.addEventListener("mousedown", this, true);
            window.addEventListener("scroll", this, true);
        }
    }
};

WK.Popover.FadeOutClassName = "fade-out";
WK.Popover.canvasId = 0;
WK.Popover.CornerRadius = 5;
WK.Popover.MinWidth = 40;
WK.Popover.MinHeight = 40;
WK.Popover.ShadowPadding = 5;
WK.Popover.ContentPadding = 5;
WK.Popover.AnchorSize = new WK.Size(22, 11);
WK.Popover.ShadowEdgeInsets = new WK.EdgeInsets(WK.Popover.ShadowPadding);
