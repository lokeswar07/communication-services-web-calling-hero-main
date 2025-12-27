// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { GroupCallLocator, TeamsMeetingLinkLocator } from '@azure/communication-calling';
import { CallAdapterLocator, CallComposite, CallCompositeOptions, CommonCallAdapter } from '@azure/communication-react';
import { Spinner, Stack, PrimaryButton } from '@fluentui/react';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSwitchableFluentTheme } from '../theming/SwitchableFluentThemeProvider';
import { useIsMobile } from '../utils/useIsMobile';

import { CallScreenProps } from './CallScreen';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

import { storeCaptions } from '../utils/AppUtils';

const SPEECH_KEY = '##################';
const SPEECH_REGION = 'eastus2';

let meetingIdGlobal: string | undefined = "";

function LokiLanguageModal({ isOpen, onClose, onConfirm }) {
  const [speaking, setSpeaking] = useState("en-US");
  const [caption, setCaption] = useState("en");

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#000',
          padding: '20px',
          borderRadius: '4px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Choose Languages</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
          >
            &times;
          </button>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label htmlFor="speakingLang">Speaking language:</label>
          <br />
          <select
            id="speakingLang"
            value={speaking}
            onChange={(e) => setSpeaking(e.target.value)}
            style={{ width: '100%', padding: '8px', margin: '8px 0' }}
          >
            <option value="en-US">English</option>
            <option value="es-ES">Spanish</option>
            <option value="de-DE">German</option>
            <option value="zh-CN">Chinese</option>
            {/* add more */}
          </select>

          <label htmlFor="captionLang">Caption language:</label>
          <br />
          <select
            id="captionLang"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            style={{ width: '100%', padding: '8px', margin: '8px 0' }}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="de">German</option>
            <option value="zh-Hans">Chinese</option>
            {/* add more */}
          </select>
        </div>
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            onClick={() => {
              if (onConfirm) {
                onConfirm({ speaking, caption });
              }
              onClose();
            }}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export type CallCompositeContainerProps = CallScreenProps & { adapter?: CommonCallAdapter };

export function useCaptionPolling(meetingId: string, intervalMs = 2000) {
  const [captions, setCaptions] = useState<string[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchCaptions() {
      if (controllerRef.current) {
        // cancel prior request if still pending
        controllerRef.current.abort();
      }
      const controller = new AbortController();
      controllerRef.current = controller;


      try {
        const requestOptions = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
        };


        const resp = await fetch(`/captions?meetingId=${meetingIdGlobal}`, requestOptions);
        if (!resp.ok) throw new Error("Network response was not OK");
        // console.log(await resp.json());
        const data: string[] = await resp.json();
        console.log(data);
        if (mounted) {
          setCaptions(data);
        }
      } catch (err) {
        // if (err.name !== "AbortError") {
          console.error("Error fetching captions:", err);
        // }
      }
    }

    // Immediately fetch once, then schedule repeated fetches
    fetchCaptions();
    const id = setInterval(fetchCaptions, intervalMs);

    return () => {
      mounted = false;
      clearInterval(id);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [meetingId, intervalMs]);

  return captions;
}

export default function CaptionViewer(props: { meetingId }) {
  const captions = useCaptionPolling(props.meetingId, 2000);

  return (
    <div>
      {captions.map((c, idx) => (
        <div key={idx}>
          <b>{c}</b>
        </div>
      ))}
    </div>
  );
}

let slang = "en";
let clang = "en";

export const CallCompositeContainer = (props: CallCompositeContainerProps): JSX.Element => {
  const { adapter } = props;
  const [modalOpen, setModalOpen] = useState(false);


  const handleConfirm = ({ speaking, caption }) => {
    console.log('Speaking:', speaking);
    console.log('Caption:', caption);
    slang = speaking;
    clang = caption;
    // do something with them
  };
  const { currentTheme, currentRtl } = useSwitchableFluentTheme();
  const isMobileSession = useIsMobile();
  // const shouldHideScreenShare = isMobileSession || isIOS();
  const shouldHideScreenShare = true;

  // const [isListening, setIsListening] = useState(false);
  // const speechConfig = useRef(null);
  const audioConfig = useRef<sdk.AudioConfig | null>(null);
  const recognizer = useRef<sdk.TranslationRecognizer| null>(null);

  // const [myTranscript, setMyTranscript] = useState("");
  // const [recognizingTranscript, setRecTranscript] = useState("");

  // useEffect(() => {


  //   // return () => {
  //   //   recognizer.current.stopContinuousRecognitionAsync(() => {
  //   //     setIsListening(false);
  //   //   });
  //   // };
  // }, []);


  // const changeCaptions = () => {
  //     setModalOpen(true);

  // }

  const startListening = () => {
    //  speechConfig.current = sdk.SpeechConfig.fromSubscription(
    //   SPEECH_KEY,
    //   SPEECH_REGION
    // );
    // speechConfig.current.speechRecognitionLanguage = 'en-US';
    console.log(slang.toString(), clang.toString());  

    const speechTranslationConfig = sdk.SpeechTranslationConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
    speechTranslationConfig.speechRecognitionLanguage = slang.toString();
    const language = clang.toString();
    speechTranslationConfig.addTargetLanguage(language);

    audioConfig.current = sdk.AudioConfig.fromDefaultMicrophoneInput();

    recognizer.current = new sdk.TranslationRecognizer(
      // speechConfig.current,
      speechTranslationConfig,
      audioConfig.current
    );

    console.log("recognizer: ", recognizer.current);

    // const processRecognizedTranscript = (event) => {
    //   const result = event.result;
    //   console.log('Recognition result:', result);

    //   if (result.reason === sdk.ResultReason.RecognizedSpeech) {
    //     const transcript = result.text;
    //     console.log('Transcript: -->', transcript);
    //     // Call a function to process the transcript as needed

    //     // setMyTranscript(transcript);
    //   }
    // };

    const processTransRecognizedTranscript = (event) => {
      const result = event.result;
      if (result.reason === sdk.ResultReason.TranslatedSpeech) {
        const transcript = result.translations.get(language);
        console.log('Translated Transcript: -->', transcript);
        // Call a function to process the transcript as needed
        let meetingId = adapter?.getState().call?.id;
        meetingIdGlobal = meetingId;
        storeCaptions("1", meetingId, result.text, transcript);
        // recognizer.current.close();
        // setMyTranscript(transcript);
      }
    };

    const processRecognizingTranscript = (event) => {
      const result = event.result;
      console.log('Recognition result:', result.text);
      if (result.reason === sdk.ResultReason.RecognizingSpeech) {
        const transcript = result.text;
        console.log('Transcript: -->', transcript);
        // Call a function to process the transcript as needed

        // setRecTranscript(transcript);
      }
    }

    // const processTransRecognizingTranscript = (event) => {
    //   const result = event.result;
    //   console.log('Recognition result:', result);
    //   if (result.reason === sdk.ResultReason.RecognizingSpeech) {
    //     const transcript = result.text;
    //     console.log('Transcript: -->', transcript);
    //     // Call a function to process the transcript as needed

    //     // setRecTranscript(transcript);
    //   }
    // }

    recognizer.current.recognized = (s, e) => processTransRecognizedTranscript(e);
    recognizer.current.recognizing = (s, e) => processRecognizingTranscript(e);

    recognizer.current.startContinuousRecognitionAsync(() => {
      console.log('Speech recognition started.');
      // setIsListening(true);
    });
  }

  // const pauseListening = () => {
  //   // setIsListening(false);
  //   if(recognizer.current !== null)
  //     recognizer.current.stopContinuousRecognitionAsync();
  //   console.log('Paused listening.');
  // };

  // const resumeListening = () => {
  //   if (!isListening) {
  //     setIsListening(true);
  //     recognizer.current.startContinuousRecognitionAsync(() => {
  //       console.log('Resumed listening...');
  //     });
  //   }
  // };

  const stopListening = () => {
    // setIsListening(false);
    if(recognizer.current !== null)
    recognizer.current.stopContinuousRecognitionAsync(() => {
      console.log('Speech recognition stopped.');
    });
  };


  useEffect(() => {
    /**
     * We want to make sure that the page is up to date. If for example a browser is dismissed
     * on mobile, the page will be stale when opened again. This event listener will reload the page
     */
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        window.location.reload();
      }
    });
    return () => {
      window.removeEventListener('pageshow', () => {
        window.location.reload();
      });
    };
  }, []);

  const options: CallCompositeOptions = useMemo(
    () => ({
      callControls: {
        cameraButton: false,
        captionsButton: false,
        devicesButton: false,
        raiseHandButton: false,
        reactionButton: false,
        realTimeTextButton: false,
        screenShareButton: shouldHideScreenShare ? false : undefined,
        endCallButton: false,
        holdButton: false,
        galleryControlsButton: false,
        moreButton: false,
        dtmfDialerButton: false,
        // endCallButton: {
        //   hangUpForEveryone: 'endCallOptions'
        // }
      },
      disableAutoShowDtmfDialer: { dialerBehavior: 'autoShow' }
    }),
    [shouldHideScreenShare]
  );

  // Dispose of the adapter in the window's before unload event.
  // This ensures the service knows the user intentionally left the call if the user
  // closed the browser tab during an active call.
  useEffect(() => {
    const disposeAdapter = (): void => adapter?.dispose();
    window.addEventListener('beforeunload', disposeAdapter);
    return () => window.removeEventListener('beforeunload', disposeAdapter);
  }, [adapter]);

  if (!adapter) {
    return (
      <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { height: '100%' } }}>
        <Spinner label={'Creating adapter'} ariaLive="assertive" labelPosition="top" />
      </Stack>
    );
  }

  let callInvitationUrl: string | undefined = window.location.href;
  // Only show the call invitation url if the call is a group call or Teams call, do not show for Rooms, 1:1 or 1:N calls
  if (props.callLocator && !isGroupCallLocator(props.callLocator) && !isTeamsMeetingLinkLocator(props.callLocator)) {
    callInvitationUrl = undefined;
  }
  // console.log("Hiii")
  // console.log(adapter?.getState())

  // adapter.setCaptionLanguage("fr-fr");
  // adapter 


  return (
    <div>
      <CallComposite
        adapter={adapter}
        fluentTheme={currentTheme.theme}
        rtl={currentRtl}
        callInvitationUrl={callInvitationUrl}
        formFactor={isMobileSession ? 'mobile' : 'desktop'}
        options={options}
      />

      <PrimaryButton onClick={startListening}>Start Captions</PrimaryButton>
      <PrimaryButton onClick={stopListening}>Stop Captions</PrimaryButton>
      {/* <PrimaryButton onClick={pauseListening}>Pause</PrimaryButton> */}
      <PrimaryButton onClick={() => {
        setModalOpen(true);
      }}>Captions Setting</PrimaryButton>
      {/* <StartCaptionsButtonSelector/>     */}
      <LokiLanguageModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          startListening();
        }}
        onConfirm={handleConfirm}
      />
      <CaptionViewer meetingId={adapter?.getState().call?.id.toString()}></CaptionViewer>

    </div>
  );
};

const isTeamsMeetingLinkLocator = (locator: CallAdapterLocator): locator is TeamsMeetingLinkLocator => {
  return 'meetingLink' in locator;
};

const isGroupCallLocator = (locator: CallAdapterLocator): locator is GroupCallLocator => {
  return 'groupId' in locator;
};
