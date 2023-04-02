using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The Blank Page item template is documented at https://go.microsoft.com/fwlink/?LinkId=402352&clcid=0x409

namespace JSLinuxUWP
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        public MainPage()
        {
            this.InitializeComponent();
            MainWebFrame.Navigate(new Uri(@"ms-appx-web:///jslinux-mobile/index.html"));
           

        }

        private void MainWebFrame_FrameNavigationStarting(WebView sender, WebViewNavigationStartingEventArgs args)
        {

        }

        private void MainWebFrame_FrameNavigationCompleted(WebView sender, WebViewNavigationCompletedEventArgs args)
        {

        }

        private void MainWebFrame_FrameContentLoading(WebView sender, WebViewContentLoadingEventArgs args)
        {

        }

        private void MainWebFrame_NavigationStarting(WebView sender, WebViewNavigationStartingEventArgs args)
        {

        }

        private void MainWebFrame_NavigationCompleted(WebView sender, WebViewNavigationCompletedEventArgs args)
        {

        }

        private void MainWebFrame_NavigationFailed(object sender, WebViewNavigationFailedEventArgs e)
        {

        }

        private void MainWebFrame_ScriptNotify(object sender, NotifyEventArgs e)
        {

        }
    }
}
