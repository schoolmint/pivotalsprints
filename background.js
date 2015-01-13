var id = 100;
var url = '';

chrome.runtime.onMessage.addListener(openPivotate);


function openPivotate(request, sender, sendResponse) {
    var viewTabUrl = chrome.extension.getURL('index.html#/');
    chrome.tabs.create({url: viewTabUrl}, function(tab) {});
}

chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.executeScript({
        // Dummy code for future use
        code: 'chrome.runtime.sendMessage({location: window.location})'
    });
});
