
/*
 * Copyright (C) 2015 University of Washington.
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

var WK = WK || {};

WK.Test = function(fullName)
{
    this.fullName = fullName;
}

WK.Test.prototype = {
    __proto__: WK.Object,
    constructor: WK.Test,

    trimmedName: function(maxLength)
    {
        if (this.fullName.length <= maxLength)
            return this.fullName;

        // The goal of this trimming strategy is to make it easy to scan the
        // left edge alphabetically, and preserve a unique filename fragment
        // on the right edge that can be used as a search string. When there's
        // not enough space, sacrifice middle path components.

        // Always preserve the leading path component.
        var parts = this.fullName.split('/');
        var first = parts[0];
        var last = parts[parts.length - 1];
        if (last.length + first.length > maxLength)
            return first + "/..." + last.slice(4 + last.length - maxLength + first.length);

        // If we can fit the entire first and last component, try to add more
        // components starting from the right side and stopping when out of space.
        var availChars = maxLength - (first.length + last.length + 2);
        for (var i = parts.length - 2; i > 0; --i) {
            if (parts[i].length > availChars)
                return first + '/...' + parts.slice(i + 1, parts.length - 2 - i).join('/') + '/' + last;

            availChars -= parts[i].length;
        }

        return this.fullName;
    }
}
