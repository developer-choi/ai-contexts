import {BigSectionAtIntroduce, CenterRowBox} from '@/components/test';
import {LazyVideo} from '@/components/element/Video';
import {RESOURCE} from '@/utils/extend/test/resources';
import React from 'react';

// URL: http://localhost:3000/staging/module/video
// Doc: https://docs.google.com/document/d/1IbhSptXmOB88OS5YPOJZ8yTAupCNFlcjyVqlAv1jInA/edit?tab=t.0#heading=h.tisczqt5zqzd
export default function Home() {
  return (
    <main>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      {/* 1. aspectRatio와 width를 지정하는 방식으로 부모컨테이너 비율 기준으로 로딩중 비디오 크기 지정 가능 */}
      <BigSectionAtIntroduce>
        <LazyVideo id="video-1" src={RESOURCE.heavy.videos[0]} aspectRatio="960/540" width="50%" />
      </BigSectionAtIntroduce>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <BigSectionAtIntroduce>
        <LazyVideo id="video-2" src={RESOURCE.heavy.videos[1]} aspectRatio="960/540" width={960}/>
      </BigSectionAtIntroduce>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
      <CenterRowBox>Row</CenterRowBox>
    </main>
  );
}
