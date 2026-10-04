import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { browser } from 'wxt/browser'

function App() {
  const params =
    new URLSearchParams(
      window.location.search
    )

  const alarmId =
    params.get('alarmId') || ''

  const alarmName =
    params.get('name') || 'Alarm'

  const repeat =
    params.get('repeat') || 'Once'

  const sound =
    params.get('sound') ||
    'alarm.mp3'

  const notificationId =
    params.get('notificationId') || ''

  const [alarmTime, setAlarmTime] =
    useState('')

  const [snoozeDuration, setSnoozeDuration] =
    useState(5)

  const [theme, setTheme] =
    useState<'light' | 'dark'>('light')

  const [snoozed, setSnoozed] =
    useState(false)

  const [dismissed, setDismissed] =
    useState(false)

  const audioRef =
    useRef<HTMLAudioElement | null>(null)

  const audioUrlRef =
    useRef<string | null>(null)

  const intentionalCloseRef =
    useRef(false)

  // =========================================
  // LOAD ALARM TIME
  // =========================================

  useEffect(() => {
    const loadAlarmTime =
      async () => {
        try {
          const result =
            await browser.storage.local.get(
              'alarms'
            )

          const alarms =
            (result.alarms || []) as {
              id: string
              name: string
              time: string
              repeat: string
              enabled?: boolean
              sound?: string
            }[]

          const alarm =
            alarms.find(
              (item) =>
                item.id === alarmId
            )

          if (alarm?.time) {
            setAlarmTime(
              alarm.time
            )
          }
        } catch (error) {
          console.error(
            '❌ Could not load alarm time:',
            error
          )
        }
      }

    loadAlarmTime()
  }, [alarmId])

  // =========================================
  // LOAD SETTINGS
  // =========================================

  useEffect(() => {
    const loadSettings =
      async () => {
        try {
          const result =
            await browser.storage.local.get(
              'focusbellSettings'
            )

          const savedSettings =
            result.focusbellSettings as
              | {
                  snoozeDuration?: number
                  theme?:
                    | 'light'
                    | 'dark'
                }
              | undefined

          if (
            savedSettings?.snoozeDuration
          ) {
            setSnoozeDuration(
              savedSettings.snoozeDuration
            )
          }

          if (
            savedSettings?.theme ===
            'dark'
          ) {
            setTheme('dark')
          } else {
            setTheme('light')
          }
        } catch (error) {
          console.error(
            '❌ Could not load FocusBell settings:',
            error
          )
        }
      }

    loadSettings()
  }, [])

  // =========================================
  // FORMAT TIME
  // =========================================

  const formatTime =
    (time: string) => {
      if (!time) {
        return '--:--'
      }

      const parts =
        time.split(':')

      if (parts.length < 2) {
        return time
      }

      const hours =
        Number(parts[0])

      const minutes =
        Number(parts[1])

      if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
      ) {
        return time
      }

      const date =
        new Date()

      date.setHours(hours)
      date.setMinutes(minutes)
      date.setSeconds(0)

      return date.toLocaleTimeString(
        [],
        {
          hour: 'numeric',
          minute: '2-digit',
        }
      )
    }

  // =========================================
  // START ALARM SOUND
  // =========================================

  useEffect(() => {
    let audio:
      | HTMLAudioElement
      | null = null

    const startSound =
      async () => {
        try {
          const soundFile =
            sound === 'digital.mp3'
              ? 'digital.mp3'
              : sound === 'gentle.mp3'
              ? 'gentle.mp3'
              : 'alarm.mp3'

          const soundUrl =
            browser.runtime.getURL(
              `/sounds/${soundFile}`
            )

          const response =
            await fetch(soundUrl)

          if (!response.ok) {
            throw new Error(
              `Failed to load sound: ${response.status}`
            )
          }

          const audioBlob =
            await response.blob()

          const blobUrl =
            URL.createObjectURL(
              audioBlob
            )

          audioUrlRef.current =
            blobUrl

          audio =
            new Audio(blobUrl)

          audio.loop = true

          audioRef.current =
            audio

          await audio.play()

          console.log(
            '🔊 Alarm sound started'
          )
        } catch (error) {
          console.error(
            '❌ Could not start alarm sound:',
            error
          )
        }
      }

    startSound()

    return () => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
        audio.src = ''
      }

      if (
        audioUrlRef.current
      ) {
        URL.revokeObjectURL(
          audioUrlRef.current
        )

        audioUrlRef.current =
          null
      }
    }
  }, [sound])

  // =========================================
  // STOP SOUND
  // =========================================

  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  // =========================================
  // CLEAR NOTIFICATION
  // =========================================

  const clearNotification =
    async () => {
      if (!notificationId) {
        console.log(
          'ℹ️ No notification ID available'
        )

        return
      }

      try {
        await browser.notifications.clear(
          notificationId
        )

        console.log(
          '🔕 Notification cleared:',
          notificationId
        )
      } catch (error) {
        console.error(
          '❌ Could not clear notification:',
          error
        )
      }
    }

  // =========================================
  // CLEANUP WHEN POPUP IS CLOSED
  // =========================================

  useEffect(() => {
    const handleBeforeUnload =
      () => {
        if (
          intentionalCloseRef.current
        ) {
          return
        }

        console.log(
          '🪟 Alarm popup is being closed'
        )

        stopSound()

        if (notificationId) {
          browser.notifications
            .clear(notificationId)
            .then(() => {
              console.log(
                '🔕 Notification cleared because popup was closed'
              )
            })
            .catch((error) => {
              console.error(
                '❌ Could not clear notification after popup close:',
                error
              )
            })
        }
      }

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    )

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      )
    }
  }, [notificationId])

  // =========================================
  // DISMISS ALARM
  // =========================================

  const dismissAlarm =
    async () => {
      if (!alarmId) return

      try {
        intentionalCloseRef.current =
          true

        stopSound()

        await clearNotification()

        const alarmsResult =
          await browser.storage.local.get(
            'alarms'
          )

        const alarms =
          (alarmsResult.alarms ||
            []) as {
              id: string
              name: string
              time: string
              repeat: string
              enabled?: boolean
              sound?: string
            }[]

        const historyResult =
          await browser.storage.local.get(
            'alarmHistory'
          )

        const history =
          (historyResult.alarmHistory ||
            []) as {
              id: string
              name: string
              time: string
              repeat: string
              dismissedAt: string
            }[]

        const originalAlarm =
          alarms.find(
            (alarm) =>
              alarm.id === alarmId
          )

        if (originalAlarm) {
          const historyItem = {
            id:
              `${alarmId}-${Date.now()}`,

            name:
              originalAlarm.name,

            time:
              originalAlarm.time,

            repeat:
              originalAlarm.repeat,

            dismissedAt:
              new Date().toLocaleString(),
          }

          const updatedHistory = [
            historyItem,
            ...history,
          ]

          await browser.storage.local.set({
            alarmHistory:
              updatedHistory,
          })

          console.log(
            '📝 Alarm added to Past Alarms'
          )
        }

        if (
          repeat === 'Once'
        ) {
          await browser.alarms.clear(
            alarmId
          )

          const updatedAlarms =
            alarms.filter(
              (alarm) =>
                alarm.id !== alarmId
            )

          await browser.storage.local.set({
            alarms:
              updatedAlarms,
          })

          console.log(
            '🗑️ Once alarm removed from Upcoming Alarms'
          )
        }

        if (
          repeat !== 'Once'
        ) {
          console.log(
            `🔁 ${repeat} alarm remains active`
          )
        }

        setDismissed(true)

        setTimeout(() => {
          window.close()
        }, 1000)
      } catch (error) {
        console.error(
          '❌ Dismiss failed:',
          error
        )
      }
    }

  // =========================================
  // SNOOZE ALARM
  // =========================================

  const snoozeAlarm =
    async () => {
      if (!alarmId) return

      try {
        intentionalCloseRef.current =
          true

        stopSound()

        await clearNotification()

        const snoozeId =
          `${alarmId}__snooze__${Date.now()}`

        await browser.storage.local.set({
          [`snooze_${snoozeId}`]: {
            originalAlarmId:
              alarmId,

            name:
              alarmName,

            repeat:
              repeat,

            sound:
              sound,
          },
        })

        await browser.alarms.create(
          snoozeId,
          {
            when:
              Date.now() +
              snoozeDuration *
                60 *
                1000,
          }
        )

        console.log(
          `😴 Alarm snoozed for ${snoozeDuration} minutes`
        )

        setSnoozed(true)

        setTimeout(() => {
          window.close()
        }, 1000)
      } catch (error) {
        console.error(
          '❌ Snooze failed:',
          error
        )
      }
    }

  // =========================================
  // DISMISSED SCREEN
  // =========================================

  if (dismissed) {
    return (
      <div
        className={`alarm-page result-page ${
          theme === 'dark'
            ? 'dark-theme'
            : ''
        }`}
      >
        <div className="alarm-card result-card">

          <div className="result-icon success">
            ✓
          </div>

          <div className="result-badge">
            COMPLETED
          </div>

          <h1>
            Alarm Dismissed
          </h1>

          <p>
            {alarmName}
          </p>

        </div>
      </div>
    )
  }

  // =========================================
  // SNOOZED SCREEN
  // =========================================

  if (snoozed) {
    return (
      <div
        className={`alarm-page result-page ${
          theme === 'dark'
            ? 'dark-theme'
            : ''
        }`}
      >
        <div className="alarm-card result-card">

          <div className="result-icon snooze-icon">
            😴
          </div>

          <div className="result-badge">
            SNOOZED
          </div>

          <h1>
            Alarm Snoozed
          </h1>

          <p>
            {alarmName}
          </p>

          <small>
            Alarm will ring again in
            <strong>
              {' '}
              {snoozeDuration}{' '}
              minute
              {snoozeDuration !== 1
                ? 's'
                : ''}
            </strong>
            .
          </small>

        </div>
      </div>
    )
  }

  // =========================================
  // RINGING SCREEN
  // =========================================

  return (
    <div
      className={`alarm-page ringing-page ${
        theme === 'dark'
          ? 'dark-theme'
          : ''
      }`}
    >
      <div className="background-glow glow-one">
      </div>

      <div className="background-glow glow-two">
      </div>

      <div className="alarm-card ringing-card">

        <div className="ringing-status">
          <span className="status-dot">
          </span>

          ALARM RINGING
        </div>

        <div className="bell-wrapper">

          <div className="bell-ring ring-one">
          </div>

          <div className="bell-ring ring-two">
          </div>

          <div className="bell">
            🔔
          </div>

        </div>

        <div className="brand">
          FocusBell
        </div>

        <h1>
          {alarmName}
        </h1>

        <div className="alarm-time-display">
          {formatTime(alarmTime)}
        </div>

        <p className="ringing-message">
          Your alarm is ringing
        </p>

        <div className="alarm-actions-large">

          <button
            className="snooze"
            onClick={
              snoozeAlarm
            }
          >
            <span className="button-icon">
              😴
            </span>

            <span>
              Snooze {snoozeDuration}{' '}
              minute
              {snoozeDuration !== 1
                ? 's'
                : ''}
            </span>
          </button>

          <button
            className="dismiss"
            onClick={
              dismissAlarm
            }
          >
            <span className="button-icon">
              🔕
            </span>

            <span>
              Dismiss Alarm
            </span>
          </button>

        </div>

        <div className="repeat-info">
          🔁 {repeat}
        </div>

      </div>
    </div>
  )
}

export default App