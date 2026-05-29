/*
 * NE      : React giris noktasi - uygulamayi #root'a baglar; offline font + global stilleri yukler.
 * NEDEN   : Tek giris; font @fontsource ile GOMULU (internetsiz arkadas bilgisayarinda calisir).
 * NASIL   : @fontsource-variable/inter import (tum agirliklar tek degisken font) + index.css + App.
 * YAN ETKI: StrictMode dev'de efektleri iki kez kosturur; veri kaynagi cleanup ile guvenli durur/baslar.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
