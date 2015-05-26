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

WK.KeyboardShortcut = function(modifiers, key, callback, targetElement)
{
    WK.Object.call(this);

    console.assert(key);
    console.assert(!callback || typeof callback === "function");
    console.assert(!targetElement || targetElement instanceof Element);

    if (typeof key === "string") {
        key = key[0].toUpperCase();
        key = new WK.Key(key.charCodeAt(0), key);
    }

    if (callback && !targetElement)
        targetElement = document;

    this._modifiers = modifiers || WK.KeyboardShortcut.Modifier.None;
    this._key = key;
    this._targetElement = targetElement;
    this._callback = callback;
    this._disabled = false;
    this._implicitlyPreventsDefault = true;

    if (targetElement) {
        var targetKeyboardShortcuts = targetElement._keyboardShortcuts;
        if (!targetKeyboardShortcuts)
            targetKeyboardShortcuts = targetElement._keyboardShortcuts = [];

        targetKeyboardShortcuts.push(this);

        if (!WK.KeyboardShortcut._registeredKeyDownListener) {
            WK.KeyboardShortcut._registeredKeyDownListener = true;
            window.addEventListener("keydown", WK.KeyboardShortcut._handleKeyDown);
        }
    }
}

WK.KeyboardShortcut._handleKeyDown = function(event)
{
    if (event.defaultPrevented)
        return;

    for (var targetElement = event.target; targetElement; targetElement = targetElement.parentNode) {
        if (!targetElement._keyboardShortcuts)
            continue;

        for (var i = 0; i < targetElement._keyboardShortcuts.length; ++i) {
            var keyboardShortcut = targetElement._keyboardShortcuts[i];
            if (!keyboardShortcut.matchesEvent(event))
                continue;

            if (!keyboardShortcut.callback)
                continue;

            keyboardShortcut.callback(event, keyboardShortcut);

            if (keyboardShortcut.implicitlyPreventsDefault)
                event.preventDefault();

            return;
        }
    }
}

WK.KeyboardShortcut.prototype = {
    __proto__: WK.Object,
    constructor: WK.KeyboardShortcut,

    // Public

    get modifiers()
    {
        return this._modifiers;
    },

    get key()
    {
        return this._key;
    },

    get displayName()
    {
        var result = "";

        if (this._modifiers & WK.KeyboardShortcut.Modifier.Control)
            result += "\u2303";
        if (this._modifiers & WK.KeyboardShortcut.Modifier.Option)
            result += window.navigator.userAgent.indexOf("Mac OS X") !== -1 ? "\u2325" : "\u2387";
        if (this._modifiers & WK.KeyboardShortcut.Modifier.Shift)
            result += "\u21e7";
        if (this._modifiers & WK.KeyboardShortcut.Modifier.Command)
            result += "\u2318";

        result += this._key.toString();

        return result;
    },

    get callback()
    {
        return this._callback;
    },

    set callback(callback)
    {
        console.assert(!callback || typeof callback === "function");

        this._callback = callback || null;
    },

    get disabled()
    {
        return this._disabled;
    },

    set disabled(disabled)
    {
        this._disabled = disabled || false;
    },

    get implicitlyPreventsDefault()
    {
        return this._implicitlyPreventsDefault;
    },

    set implicitlyPreventsDefault(implicitly)
    {
        this._implicitlyPreventsDefault = implicitly;
    },

    unbind()
    {
        this._disabled = true;

        if (!this._targetElement)
            return;

        var targetKeyboardShortcuts = this._targetElement._keyboardShortcuts;
        if (!targetKeyboardShortcuts)
            return;

        targetKeyboardShortcuts.remove(this);
    },

    matchesEvent(event)
    {
        if (this._disabled)
            return false;

        if (this._key.keyCode !== event.keyCode)
            return false;

        var eventModifiers = WK.KeyboardShortcut.Modifier.None;
        if (event.shiftKey)
            eventModifiers |= WK.KeyboardShortcut.Modifier.Shift;
        if (event.ctrlKey)
            eventModifiers |= WK.KeyboardShortcut.Modifier.Control;
        if (event.altKey)
            eventModifiers |= WK.KeyboardShortcut.Modifier.Option;
        if (event.metaKey)
            eventModifiers |= WK.KeyboardShortcut.Modifier.Command;
        return this._modifiers === eventModifiers;
    }
};

WK.Key = function(keyCode, displayName)
{
    this._keyCode = keyCode;
    this._displayName = displayName;
}

WK.Key.prototype = {
    constructor: WK.Key,

    // Public

    get keyCode()
    {
        return this._keyCode;
    },

    get displayName()
    {
        return this._displayName;
    },

    toString()
    {
        return this._displayName;
    }
};

WK.KeyboardShortcut.Modifier = {
    None: 0,
    Shift: 1,
    Control: 2,
    Option: 4,
    Command: 8,

    get CommandOrControl()
    {
        return window.navigator.userAgent.indexOf("Mac OS X") !== -1 ? this.Command : this.Control;
    }
};

WK.KeyboardShortcut.Key = {
    Backspace: new WK.Key(8, "\u232b"),
    Tab: new WK.Key(9, "\u21e5"),
    Enter: new WK.Key(13, "\u21a9"),
    Escape: new WK.Key(27, "\u238b"),
    Space: new WK.Key(32, "Space"),
    PageUp: new WK.Key(33, "\u21de"),
    PageDown: new WK.Key(34, "\u21df"),
    End: new WK.Key(35, "\u2198"),
    Home: new WK.Key(36, "\u2196"),
    Left: new WK.Key(37, "\u2190"),
    Up: new WK.Key(38, "\u2191"),
    Right: new WK.Key(39, "\u2192"),
    Down: new WK.Key(40, "\u2193"),
    Delete: new WK.Key(46, "\u2326"),
    Zero: new WK.Key(48, "0"),
    F1: new WK.Key(112, "F1"),
    F2: new WK.Key(113, "F2"),
    F3: new WK.Key(114, "F3"),
    F4: new WK.Key(115, "F4"),
    F5: new WK.Key(116, "F5"),
    F6: new WK.Key(117, "F6"),
    F7: new WK.Key(118, "F7"),
    F8: new WK.Key(119, "F8"),
    F9: new WK.Key(120, "F9"),
    F10: new WK.Key(121, "F10"),
    F11: new WK.Key(122, "F11"),
    F12: new WK.Key(123, "F12"),
    Semicolon: new WK.Key(186, ";"),
    Plus: new WK.Key(187, "+"),
    Comma: new WK.Key(188, ","),
    Minus: new WK.Key(189, "-"),
    Period: new WK.Key(190, "."),
    Slash: new WK.Key(191, "/"),
    Backslash: new WK.Key(220, "\\"),
    Apostrophe: new WK.Key(192, "`"),
    SingleQuote: new WK.Key(222, "\'")
};
