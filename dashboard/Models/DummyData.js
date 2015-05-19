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

WK.DummyData = {};

WK.DummyData.macQueueMetrics = {
attempts: [
    {
        name: '1',
        attempt: {
            percent: '100%',
            caption: '2-55s (x\u0305 5s)'
        },
        pass: {
            percent: '50%',
            caption: '2-55s (x\u0305 5s)'
        },
        fail: {
            percent: '30%',
            caption: '2-55s (x\u0305 5s)'
        },
        abort: {
            percent: '10%',
            caption: '2-55s (x\u0305 5s)'
        }
    },
    {
        name: '2',
        attempt: {
            percent: '10%',
            caption: '2-55s (x\u0305 5s)'
        },
        pass: {
            percent: '1%',
            caption: '2-55s (x\u0305 5s)'
        },
        fail: {
            percent: '4%',
            caption: '2-55s (x\u0305 5s)'
        },
        abort: {
            percent: '2%',
            caption: '2-55s (x\u0305 5s)'
        }
    },
    {
        name: '3+',
        attempt: {
            percent: '3%',
            caption: '2-55s (x\u0305 5s)'
        },
        pass: {
            percent: '0.5%',
            caption: '2-55s (x\u0305 5s)'
        },
        fail: {
            percent: '1%',
            caption: '2-55s (x\u0305 5s)'
        },
        abort: {
            percent: '1.5%',
            caption: '2-55s (x\u0305 5s)'
        }
    }
]
};

WK.DummyData.iosQueueMetrics = {
attempts: [
    {
        name: '1',
        attempt: {
            percent: '100%',
            caption: '2-55s (x\u0305 5s)'
        },
        pass: {
            percent: '50%',
            caption: '2-55s (x\u0305 5s)'
        },
        fail: {
            percent: '30%',
            caption: '2-55s (x\u0305 5s)'
        },
        abort: {
            percent: '10%',
            caption: '2-55s (x\u0305 5s)'
        }
    },
    {
        name: '2',
        attempt: {
            percent: '10%',
            caption: '2-55s (x\u0305 5s)'
        },
        pass: {
            percent: '1%',
            caption: '2-55s (x\u0305 5s)'
        },
        fail: {
            percent: '4%',
            caption: '2-55s (x\u0305 5s)'
        },
        abort: {
            percent: '2%',
            caption: '2-55s (x\u0305 5s)'
        }
    }
]
};

WK.DummyData.buildAttempts = [
{
    try_num: 1,
    result_type: 'try',
    patch_name: 2839492,
    patch_url: '#',
    start: '1h 30s ago',
    duration: '30m 10s',
    author_name: 'agomez',
    author_url: '#',
    bug_description: '141173: [GTK] Web Inspector: New Images for Object...',
    bug_url: '#'
},
{
    try_num: 1,
    result_type: 'try',
    patch_name: 2839492,
    patch_url: '#',
    start: '1h 30s ago',
    duration: '30m 10s',
    author_name: 'agomez',
    author_url: '#',
    bug_description: '141173: [GTK] Web Inspector: New Images for Object...',
    bug_url: '#'
},
{
    try_num: 1,
    result_type: 'try',
    patch_name: 2839492,
    patch_url: '#',
    start: '1h 30s ago',
    duration: '30m 10s',
    author_name: 'agomez',
    author_url: '#',
    bug_description: '141173: [GTK] Web Inspector: New Images for Object...',
    bug_url: '#'
},
{
    try_num: 1,
    result_type: 'try',
    patch_name: 2839492,
    patch_url: '#',
    start: '1h 30s ago',
    duration: '30m 10s',
    author_name: 'agomez',
    author_url: '#',
    bug_description: '141173: [GTK] Web Inspector: New Images for Object...',
    bug_url: '#'
}
];
