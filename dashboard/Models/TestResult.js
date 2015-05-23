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

WK.TestResult = function(duration, outcome)
{
    this.duration = duration;
    this.outcome = outcome;
}

WK.TestResult.Outcome = {
    Pass: "outcome-pass",
    Fail: "outcome-fail",
    Timeout: "outcome-timeout",
    Crash: "outcome-crash",
    ImageDiff: "outcome-imagediff"
}

WK.TestResult.Outcome.fromCharacter = function(c) {
    switch (c) {
        case 'P': return WK.TestResult.Outcome.Pass;
        case 'F': return WK.TestResult.Outcome.Fail;
        case 'T': return WK.TestResult.Outcome.Timeout;
        case 'C': return WK.TestResult.Outcome.Crash;
        case 'I': return WK.TestResult.Outcome.ImageDiff;
        default: console.error("Unknown outcome character: ", c);
    }
}
