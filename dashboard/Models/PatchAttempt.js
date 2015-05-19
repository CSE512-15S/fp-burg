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

WK.PatchAttempt = function(patchId, queueId, ordinal, waitDuration, processDuration, resolution)
{
    WK.Object.call(this);

    this.patchId = patchId;
    this.queueId = queueId;
    this.ordinal = ordinal;
    this.waitDuration = waitDuration;
    /* attempt duration = total duration / (retries + 1) */
    this.processDuration = processDuration;
    this.outcome = outcomeFromResultText(resolution);

    function outcomeFromResultText(text) {
        switch (text) {
        case "pass": return WK.PatchAttempt.Outcome.Pass;
        case "fail": return WK.PatchAttempt.Outcome.Fail;
        case "retry": return WK.PatchAttempt.Outcome.Retry;
        case "not processed": return WK.PatchAttempt.Outcome.Abort;
        case "could not apply": return WK.PatchAttempt.Outcome.Abort;
        case "internal error": return WK.PatchAttempt.Outcome.Error;
        case "in progress": return WK.PatchAttempt.Outcome.Pending;
        }
        return null;
    }
};

WK.PatchAttempt.prototype = {
    constructor: WK.PatchAttempt,
    __proto__: WK.Object.prototype,

    get patchURL()
    {
        return "https://bugs.webkit.org/attachment.cgi?id=" + this.patchId + "&action=prettypatch";
    }
};

WK.PatchAttempt.Outcome = {
    Pass: "outcome-pass",
    Fail: "outcome-fail",
    Retry: "outcome-retry",
    Abort: "outcome-abort",
    Error: "outcome-error",
    Pending: "outcome-pending"
}
