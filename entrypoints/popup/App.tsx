import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { browser } from 'wxt/browser'
import './App.css'

type Alarm = {
  id: string
  name: string
  time: string
  repeat: string
  enabled: boolean
  sound: string
}

type AlarmHistory = {
  id: string
  name: string
  time: string
  repeat: string
  dismissedAt: string
}

type Settings = {
  theme: 'light' | 'dark'
  defaultSound: string
  snoozeDuration: number
}

type PickerStep = 'hour' | 'minute'

type TimeFieldProps = {
  value: string
  onChange: (value: string) => void
  onOpenClock: () => void
  dark: boolean
}

const CLOCK_NUMBERS = [
  12, 1, 2, 3, 4, 5,
  6, 7, 8, 9, 10, 11,
]

const SOUNDS = [
  {
    value: 'alarm.mp3',
    label: '🔔 Classic Bell',
  },
  {
    value: 'digital.mp3',
    label: '⏱️ Digital Alarm',
  },
  {
    value: 'gentle.mp3',
    label: '🌅 Gentle Wake',
  },
]

function getTimeParts(
  time: string
): {
  hour: string
  minute: string
  period: 'AM' | 'PM'
} {
  if (!time) {
    return {
      hour: '',
      minute: '',
      period: 'AM',
    }
  }

  const [hourText, minuteText] =
    time.split(':')

  const hours = Number(hourText)
  const minutes = Number(minuteText)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return {
      hour: '',
      minute: '',
      period: 'AM',
    }
  }

  return {
    hour: String(
      hours % 12 || 12
    ).padStart(2, '0'),

    minute: String(
      minutes
    ).padStart(2, '0'),

    period:
      hours >= 12
        ? 'PM'
        : 'AM',
  }
}

function convertTo24Hour(
  hourText: string,
  minuteText: string,
  period: 'AM' | 'PM'
) {
  const hour = Number(hourText)
  const minute = Number(minuteText)

  if (
    !Number.isInteger(hour) ||
    hour < 1 ||
    hour > 12
  ) {
    return null
  }

  if (
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  let hours24 = hour % 12

  if (period === 'PM') {
    hours24 += 12
  }

  return `${String(
    hours24
  ).padStart(
    2,
    '0'
  )}:${String(
    minute
  ).padStart(
    2,
    '0'
  )}`
}

function TimeField({
  value,
  onChange,
  onOpenClock,
  dark,
}: TimeFieldProps) {
  const initial = getTimeParts(value)

  const [hour, setHour] =
    useState(initial.hour)

  const [minute, setMinute] =
    useState(initial.minute)

  const [period, setPeriod] =
    useState<'AM' | 'PM'>(
      initial.period
    )

  const minuteRef =
    useRef<HTMLInputElement | null>(
      null
    )

  useEffect(() => {
    const parts =
      getTimeParts(value)

    setHour(parts.hour)
    setMinute(parts.minute)
    setPeriod(parts.period)
  }, [value])

  const updateTime = (
    nextHour: string,
    nextMinute: string,
    nextPeriod: 'AM' | 'PM'
  ) => {
    const converted =
      convertTo24Hour(
        nextHour,
        nextMinute,
        nextPeriod
      )

    if (converted) {
      onChange(converted)
    }
  }

  const handleHourChange = (
    rawValue: string
  ) => {
    const digits =
      rawValue
        .replace(/\D/g, '')
        .slice(0, 2)

    setHour(digits)

    if (digits.length === 2) {
      minuteRef.current?.focus()
      minuteRef.current?.select()
    }

    if (digits.length === 2) {
      updateTime(
        digits,
        minute,
        period
      )
    }
  }

  const handleMinuteChange = (
    rawValue: string
  ) => {
    const digits =
      rawValue
        .replace(/\D/g, '')
        .slice(0, 2)

    setMinute(digits)

    if (digits.length === 2) {
      updateTime(
        hour,
        digits,
        period
      )
    }
  }

  const handlePeriodChange = (
    nextPeriod: 'AM' | 'PM'
  ) => {
    setPeriod(nextPeriod)

    updateTime(
      hour,
      minute,
      nextPeriod
    )
  }

  const handleHourBlur = () => {
    if (!hour) {
      return
    }

    let numericHour =
      Number(hour)

    if (
      numericHour < 1
    ) {
      numericHour = 1
    }

    if (
      numericHour > 12
    ) {
      numericHour = 12
    }

    const formatted =
      String(
        numericHour
      ).padStart(2, '0')

    setHour(formatted)

    updateTime(
      formatted,
      minute,
      period
    )
  }

  const handleMinuteBlur = () => {
    if (!minute) {
      return
    }

    let numericMinute =
      Number(minute)

    if (
      numericMinute < 0
    ) {
      numericMinute = 0
    }

    if (
      numericMinute > 59
    ) {
      numericMinute = 59
    }

    const formatted =
      String(
        numericMinute
      ).padStart(2, '0')

    setMinute(formatted)

    updateTime(
      hour,
      formatted,
      period
    )
  }

  return (
    <div
      className={`time-field ${
        dark ? 'dark-time-field' : ''
      }`}
    >
      <div className="time-part">
        <input
          className="time-part-input"
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="04"
          value={hour}
          onChange={(e) =>
            handleHourChange(
              e.target.value
            )
          }
          onBlur={
            handleHourBlur
          }
          aria-label="Hour"
        />
      </div>

      <span className="time-colon">
        :
      </span>

      <div className="time-part">
        <input
          ref={minuteRef}
          className="time-part-input"
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="18"
          value={minute}
          onChange={(e) =>
            handleMinuteChange(
              e.target.value
            )
          }
          onBlur={
            handleMinuteBlur
          }
          aria-label="Minute"
        />
      </div>

      <div className="period-selector">
        <button
          type="button"
          className={
            period === 'AM'
              ? 'period-choice active'
              : 'period-choice'
          }
          onClick={() =>
            handlePeriodChange(
              'AM'
            )
          }
        >
          AM
        </button>

        <button
          type="button"
          className={
            period === 'PM'
              ? 'period-choice active'
              : 'period-choice'
          }
          onClick={() =>
            handlePeriodChange(
              'PM'
            )
          }
        >
          PM
        </button>
      </div>

      <button
        type="button"
        className="clock-input-button"
        onClick={onOpenClock}
        title="Open clock picker"
        aria-label="Open clock picker"
      >
        🕐
      </button>
    </div>
  )
}

function App() {
  const [alarmName, setAlarmName] =
    useState('')

  const [alarmTime, setAlarmTime] =
    useState('')

  const [repeat, setRepeat] =
    useState('Once')

  const [sound, setSound] =
    useState('alarm.mp3')

  const [alarms, setAlarms] =
    useState<Alarm[]>([])

  const [history, setHistory] =
    useState<AlarmHistory[]>([])

  const [showSettings, setShowSettings] =
    useState(false)

  const [settings, setSettings] =
    useState<Settings>({
      theme: 'light',
      defaultSound: 'alarm.mp3',
      snoozeDuration: 5,
    })

  const [showTimeModal, setShowTimeModal] =
    useState(false)

  const [editingAlarmId, setEditingAlarmId] =
    useState<string | null>(null)

  const [newAlarmTime, setNewAlarmTime] =
    useState('')

  const [showEditModal, setShowEditModal] =
    useState(false)

  const [editAlarmId, setEditAlarmId] =
    useState<string | null>(null)

  const [editAlarmName, setEditAlarmName] =
    useState('')

  const [editAlarmTime, setEditAlarmTime] =
    useState('')

  const [editRepeat, setEditRepeat] =
    useState('Once')

  const [editSound, setEditSound] =
    useState('alarm.mp3')

  const [showClockPicker, setShowClockPicker] =
    useState(false)

  const [clockPickerTarget, setClockPickerTarget] =
    useState<'new' | 'edit'>('new')

  const [pickerStep, setPickerStep] =
    useState<PickerStep>('hour')

  const [pickerHour, setPickerHour] =
    useState(12)

  const [pickerMinute, setPickerMinute] =
    useState(0)

  const [pickerPeriod, setPickerPeriod] =
    useState<'AM' | 'PM'>('AM')

  const clockRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const draggingMinute =
    useRef(false)

  useEffect(() => {
    browser.storage.local
      .get([
        'alarms',
        'alarmHistory',
        'focusbellSettings',
      ])
      .then((result) => {
        if (result.alarms) {
          const savedAlarms =
            result.alarms as Partial<Alarm>[]

          const normalizedAlarms =
            savedAlarms.map(
              (alarm) => ({
                ...alarm,
                enabled:
                  alarm.enabled !==
                  false,
                sound:
                  alarm.sound ||
                  'alarm.mp3',
              })
            ) as Alarm[]

          setAlarms(
            normalizedAlarms
          )

          browser.storage.local.set({
            alarms:
              normalizedAlarms,
          })
        }

        if (
          result.alarmHistory
        ) {
          setHistory(
            result.alarmHistory as AlarmHistory[]
          )
        }

        if (
          result.focusbellSettings
        ) {
          const saved =
            result.focusbellSettings as Partial<Settings>

          const loadedSettings: Settings =
            {
              theme:
                saved.theme ===
                'dark'
                  ? 'dark'
                  : 'light',

              defaultSound:
                saved.defaultSound ||
                'alarm.mp3',

              snoozeDuration:
                saved.snoozeDuration ||
                5,
            }

          setSettings(
            loadedSettings
          )

          setSound(
            loadedSettings.defaultSound
          )
        }
      })
  }, [])

  const saveSettings =
    async (
      updatedSettings: Settings
    ) => {
      setSettings(
        updatedSettings
      )

      await browser.storage.local.set(
        {
          focusbellSettings:
            updatedSettings,
        }
      )
    }

  const getClockValues =
    (time: string) => {
      let hour = 12
      let minute = 0
      let period: 'AM' | 'PM' =
        'AM'

      if (time) {
        const [
          hourText,
          minuteText,
        ] = time.split(':')

        const parsedHour =
          Number(hourText)

        const parsedMinute =
          Number(minuteText)

        if (
          !Number.isNaN(
            parsedHour
          ) &&
          !Number.isNaN(
            parsedMinute
          )
        ) {
          hour =
            parsedHour % 12 ||
            12

          minute =
            Math.max(
              0,
              Math.min(
                59,
                parsedMinute
              )
            )

          period =
            parsedHour >=
            12
              ? 'PM'
              : 'AM'
        }
      } else {
        const now =
          new Date()

        const currentHour =
          now.getHours()

        hour =
          currentHour % 12 ||
          12

        minute =
          now.getMinutes()

        period =
          currentHour >= 12
            ? 'PM'
            : 'AM'
      }

      return {
        hour,
        minute,
        period,
      }
    }

  const openClockPicker =
    (
      target:
        | 'new'
        | 'edit'
    ) => {
      const currentTime =
        target === 'edit'
          ? editAlarmTime
          : alarmTime

      const values =
        getClockValues(
          currentTime
        )

      setPickerHour(
        values.hour
      )

      setPickerMinute(
        values.minute
      )

      setPickerPeriod(
        values.period
      )

      setPickerStep(
        'hour'
      )

      setClockPickerTarget(
        target
      )

      setShowClockPicker(
        true
      )
    }

  const selectPickerHour =
    (hour: number) => {
      setPickerHour(hour)
      setPickerStep(
        'minute'
      )
    }

  const getClockPosition =
    (
      index: number,
      radius: number
    ) => {
      const angle =
        (index / 12) *
          Math.PI *
          2 -
        Math.PI / 2

      return {
        left:
          50 +
          Math.cos(angle) *
            radius,

        top:
          50 +
          Math.sin(angle) *
            radius,
      }
    }

  const getMinuteFromPointer =
    (
      clientX: number,
      clientY: number
    ) => {
      if (!clockRef.current) {
        return
      }

      const rect =
        clockRef.current.getBoundingClientRect()

      const centerX =
        rect.left +
        rect.width / 2

      const centerY =
        rect.top +
        rect.height / 2

      const dx =
        clientX - centerX

      const dy =
        clientY - centerY

      let angle =
        Math.atan2(
          dy,
          dx
        ) *
        (180 / Math.PI)

      angle += 90

      if (angle < 0) {
        angle += 360
      }

      const minute =
        Math.round(
          angle / 6
        ) % 60

      setPickerMinute(
        minute
      )
    }

  const handleMinutePointerDown =
    (
      e: PointerEvent<HTMLDivElement>
    ) => {
      if (
        pickerStep !==
        'minute'
      ) {
        return
      }

      draggingMinute.current =
        true

      e.currentTarget.setPointerCapture(
        e.pointerId
      )

      getMinuteFromPointer(
        e.clientX,
        e.clientY
      )
    }

  const handleMinutePointerMove =
    (
      e: PointerEvent<HTMLDivElement>
    ) => {
      if (
        pickerStep !==
          'minute' ||
        !draggingMinute.current
      ) {
        return
      }

      getMinuteFromPointer(
        e.clientX,
        e.clientY
      )
    }

  const handleMinutePointerUp =
    (
      e: PointerEvent<HTMLDivElement>
    ) => {
      draggingMinute.current =
        false

      try {
        e.currentTarget.releasePointerCapture(
          e.pointerId
        )
      } catch {
        // Ignore pointer release errors.
      }
    }

  const confirmClockTime =
    () => {
      let hours24 =
        pickerHour % 12

      if (
        pickerPeriod ===
        'PM'
      ) {
        hours24 += 12
      }

      const selectedTime =
        `${String(
          hours24
        ).padStart(
          2,
          '0'
        )}:${String(
          pickerMinute
        ).padStart(
          2,
          '0'
        )}`

      if (
        clockPickerTarget ===
        'edit'
      ) {
        setEditAlarmTime(
          selectedTime
        )
      } else {
        setAlarmTime(
          selectedTime
        )
      }

      setShowClockPicker(
        false
      )
    }

  const cancelClockPicker =
    () => {
      setShowClockPicker(
        false
      )
    }

  const scheduleAlarm =
    async (
      alarm: Alarm
    ) => {
      const [
        hourText,
        minuteText,
      ] = alarm.time.split(':')

      const hours =
        Number(hourText)

      const minutes =
        Number(minuteText)

      const scheduledTime =
        new Date()

      scheduledTime.setHours(
        hours
      )

      scheduledTime.setMinutes(
        minutes
      )

      scheduledTime.setSeconds(
        0
      )

      scheduledTime.setMilliseconds(
        0
      )

      if (
        alarm.repeat ===
        'Every weekday'
      ) {
        while (
          scheduledTime.getDay() ===
            0 ||
          scheduledTime.getDay() ===
            6
        ) {
          scheduledTime.setDate(
            scheduledTime.getDate() +
              1
          )
        }

        if (
          scheduledTime.getTime() <=
          Date.now()
        ) {
          scheduledTime.setDate(
            scheduledTime.getDate() +
              1
          )

          while (
            scheduledTime.getDay() ===
              0 ||
            scheduledTime.getDay() ===
              6
          ) {
            scheduledTime.setDate(
              scheduledTime.getDate() +
                1
            )
          }
        }
      } else if (
        scheduledTime.getTime() <=
        Date.now()
      ) {
        scheduledTime.setDate(
          scheduledTime.getDate() +
            1
        )
      }

      await browser.alarms.clear(
        alarm.id
      )

      if (
        alarm.repeat ===
        'Every day'
      ) {
        await browser.alarms.create(
          alarm.id,
          {
            when:
              scheduledTime.getTime(),
            periodInMinutes:
              24 * 60,
          }
        )
      } else if (
        alarm.repeat ===
        'Every week'
      ) {
        await browser.alarms.create(
          alarm.id,
          {
            when:
              scheduledTime.getTime(),
            periodInMinutes:
              7 * 24 * 60,
          }
        )
      } else {
        await browser.alarms.create(
          alarm.id,
          {
            when:
              scheduledTime.getTime(),
          }
        )
      }
    }

  const setAlarm =
    async () => {
      if (
        !alarmName.trim() ||
        !alarmTime
      ) {
        alert(
          'Please enter an alarm name and time.'
        )
        return
      }

      const newAlarm: Alarm =
        {
          id:
            crypto.randomUUID(),

          name:
            alarmName.trim(),

          time:
            alarmTime,

          repeat,

          enabled:
            true,

          sound,
        }

      const updatedAlarms =
        [
          ...alarms,
          newAlarm,
        ]

      setAlarms(
        updatedAlarms
      )

      await browser.storage.local.set(
        {
          alarms:
            updatedAlarms,
        }
      )

      await scheduleAlarm(
        newAlarm
      )

      setAlarmName('')
      setAlarmTime('')
      setRepeat('Once')
      setSound(
        settings.defaultSound
      )
    }

  const toggleAlarm =
    async (
      id: string
    ) => {
      const alarm =
        alarms.find(
          (item) =>
            item.id === id
        )

      if (!alarm) {
        return
      }

      if (alarm.enabled) {
        await browser.alarms.clear(
          id
        )

        const updatedAlarms =
          alarms.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    enabled:
                      false,
                  }
                : item
          )

        setAlarms(
          updatedAlarms
        )

        await browser.storage.local.set(
          {
            alarms:
              updatedAlarms,
          }
        )

        return
      }

      const now =
        new Date()

      const [
        hourText,
        minuteText,
      ] = alarm.time.split(':')

      const hours =
        Number(hourText)

      const minutes =
        Number(minuteText)

      const originalTime =
        new Date()

      originalTime.setHours(
        hours
      )

      originalTime.setMinutes(
        minutes
      )

      originalTime.setSeconds(
        0
      )

      originalTime.setMilliseconds(
        0
      )

      if (
        originalTime.getTime() <=
        now.getTime()
      ) {
        setEditingAlarmId(
          id
        )

        setNewAlarmTime('')

        setShowTimeModal(
          true
        )

        return
      }

      await scheduleAlarm({
        ...alarm,
        enabled:
          true,
      })

      const updatedAlarms =
        alarms.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  enabled:
                    true,
                }
              : item
        )

      setAlarms(
        updatedAlarms
      )

      await browser.storage.local.set(
        {
          alarms:
            updatedAlarms,
        }
      )
    }

  const openEditAlarm =
    (
      alarm: Alarm
    ) => {
      setEditAlarmId(
        alarm.id
      )

      setEditAlarmName(
        alarm.name
      )

      setEditAlarmTime(
        alarm.time
      )

      setEditRepeat(
        alarm.repeat
      )

      setEditSound(
        alarm.sound
      )

      setShowEditModal(
        true
      )
    }

  const cancelEditAlarm =
    () => {
      setShowEditModal(
        false
      )

      setEditAlarmId(
        null
      )

      setEditAlarmName('')
      setEditAlarmTime('')
      setEditRepeat('Once')
      setEditSound(
        'alarm.mp3'
      )
    }

  const saveEditedAlarm =
    async () => {
      if (!editAlarmId) {
        return
      }

      if (
        !editAlarmName.trim()
      ) {
        alert(
          'Please enter an alarm name.'
        )
        return
      }

      if (!editAlarmTime) {
        alert(
          'Please choose an alarm time.'
        )
        return
      }

      const originalAlarm =
        alarms.find(
          (alarm) =>
            alarm.id ===
            editAlarmId
        )

      if (!originalAlarm) {
        return
      }

      const updatedAlarm: Alarm =
        {
          ...originalAlarm,

          name:
            editAlarmName.trim(),

          time:
            editAlarmTime,

          repeat:
            editRepeat,

          sound:
            editSound,
        }

      await browser.alarms.clear(
        editAlarmId
      )

      const updatedAlarms =
        alarms.map(
          (alarm) =>
            alarm.id ===
            editAlarmId
              ? updatedAlarm
              : alarm
        )

      setAlarms(
        updatedAlarms
      )

      await browser.storage.local.set(
        {
          alarms:
            updatedAlarms,
        }
      )

      if (
        updatedAlarm.enabled
      ) {
        await scheduleAlarm(
          updatedAlarm
        )
      }

      cancelEditAlarm()
    }

  const confirmNewAlarmTime =
    async () => {
      if (
        !editingAlarmId ||
        !newAlarmTime
      ) {
        alert(
          'Please choose a new time.'
        )
        return
      }

      const alarm =
        alarms.find(
          (item) =>
            item.id ===
            editingAlarmId
        )

      if (!alarm) {
        return
      }

      const [
        hourText,
        minuteText,
      ] =
        newAlarmTime.split(':')

      const hours =
        Number(hourText)

      const minutes =
        Number(minuteText)

      const now =
        new Date()

      const selectedTime =
        new Date()

      selectedTime.setHours(
        hours
      )

      selectedTime.setMinutes(
        minutes
      )

      selectedTime.setSeconds(
        0
      )

      selectedTime.setMilliseconds(
        0
      )

      if (
        selectedTime.getTime() <=
        now.getTime()
      ) {
        alert(
          'Please choose a time later than the current time.'
        )
        return
      }

      const updatedAlarm: Alarm =
        {
          ...alarm,

          time:
            newAlarmTime,

          enabled:
            true,
        }

      const updatedAlarms =
        alarms.map(
          (item) =>
            item.id === alarm.id
              ? updatedAlarm
              : item
        )

      setAlarms(
        updatedAlarms
      )

      await browser.storage.local.set(
        {
          alarms:
            updatedAlarms,
        }
      )

      await scheduleAlarm(
        updatedAlarm
      )

      setShowTimeModal(
        false
      )

      setEditingAlarmId(
        null
      )

      setNewAlarmTime('')
    }

  const cancelNewAlarmTime =
    () => {
      setShowTimeModal(
        false
      )

      setEditingAlarmId(
        null
      )

      setNewAlarmTime('')
    }

  const deleteAlarm =
    async (
      id: string
    ) => {
      const updatedAlarms =
        alarms.filter(
          (alarm) =>
            alarm.id !== id
        )

      setAlarms(
        updatedAlarms
      )

      await browser.storage.local.set(
        {
          alarms:
            updatedAlarms,
        }
      )

      await browser.alarms.clear(
        id
      )
    }

  const clearHistory =
    async () => {
      setHistory([])

      await browser.storage.local.set(
        {
          alarmHistory: [],
        }
      )
    }

  const changeTheme =
    async (
      theme:
        | 'light'
        | 'dark'
    ) => {
      await saveSettings({
        ...settings,
        theme,
      })
    }

  const changeDefaultSound =
    async (
      defaultSound: string
    ) => {
      await saveSettings({
        ...settings,
        defaultSound,
      })

      setSound(
        defaultSound
      )
    }

  const changeSnoozeDuration =
    async (
      snoozeDuration: number
    ) => {
      await saveSettings({
        ...settings,
        snoozeDuration,
      })
    }

  const formatDisplayTime =
    (
      time: string
    ) => {
      if (!time) {
        return 'Select time'
      }

      const [
        hourText,
        minuteText,
      ] =
        time.split(':')

      const hours =
        Number(hourText)

      const minutes =
        Number(minuteText)

      const displayHour =
        hours % 12 || 12

      const period =
        hours >= 12
          ? 'PM'
          : 'AM'

      return `${String(
        displayHour
      ).padStart(
        2,
        '0'
      )}:${String(
        minutes
      ).padStart(
        2,
        '0'
      )} ${period}`
    }

  const renderClockLabels =
    (
      selectable: boolean
    ) =>
      CLOCK_NUMBERS.map(
        (
          value,
          index
        ) => {
          const position =
            getClockPosition(
              index,
              39
            )

          if (selectable) {
            return (
              <button
                key={value}
                type="button"
                className={`clock-number ${
                  pickerHour ===
                  value
                    ? 'selected'
                    : ''
                }`}
                style={{
                  left:
                    `${position.left}%`,
                  top:
                    `${position.top}%`,
                }}
                onClick={() =>
                  selectPickerHour(
                    value
                  )
                }
              >
                {value}
              </button>
            )
          }

          return (
            <div
              key={value}
              className="clock-number minute-label"
              style={{
                left:
                  `${position.left}%`,
                top:
                  `${position.top}%`,
              }}
            >
              {value}
            </div>
          )
        }
      )

  const renderMinuteTicks =
    () =>
      Array.from(
        {
          length: 60,
        },
        (_, minute) => (
          <div
            key={minute}
            className={`minute-tick ${
              minute % 5 === 0
                ? 'major'
                : ''
            }`}
            style={{
              transform:
                `rotate(${minute * 6}deg)`,
            }}
          />
        )
      )

  return (
    <div
      className={`app ${
        settings.theme ===
        'dark'
          ? 'dark-theme'
          : ''
      }`}
    >
      <div className="header">
        <div>
          <h1>
            FocusBell
          </h1>

          <p>
            Stay on schedule.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="settings-button"
            onClick={() =>
              setShowSettings(
                !showSettings
              )
            }
            title="Settings"
          >
            ⚙️
          </button>

          <div className="bell">
            🔔
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <div className="settings-header">
            <div>
              <h2>
                Settings
              </h2>

              <p>
                Customize FocusBell
              </p>
            </div>

            <button
              className="close-settings"
              onClick={() =>
                setShowSettings(
                  false
                )
              }
            >
              ×
            </button>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <strong>
                Appearance
              </strong>

              <span>
                Choose your theme
              </span>
            </div>

            <select
              value={
                settings.theme
              }
              onChange={(e) =>
                changeTheme(
                  e.target.value as
                    | 'light'
                    | 'dark'
                )
              }
            >
              <option value="light">
                ☀️ Light
              </option>

              <option value="dark">
                🌙 Dark
              </option>
            </select>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <strong>
                Default Sound
              </strong>

              <span>
                Used for new alarms
              </span>
            </div>

            <select
              value={
                settings.defaultSound
              }
              onChange={(e) =>
                changeDefaultSound(
                  e.target.value
                )
              }
            >
              <option value="alarm.mp3">
                🔔 Classic
              </option>

              <option value="digital.mp3">
                ⏱️ Digital
              </option>

              <option value="gentle.mp3">
                🌅 Gentle
              </option>
            </select>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <strong>
                Snooze Duration
              </strong>

              <span>
                Default snooze time
              </span>
            </div>

            <select
              value={
                settings.snoozeDuration
              }
              onChange={(e) =>
                changeSnoozeDuration(
                  Number(
                    e.target.value
                  )
                )
              }
            >
              <option value="5">
                5 min
              </option>

              <option value="10">
                10 min
              </option>

              <option value="15">
                15 min
              </option>

              <option value="20">
                20 min
              </option>
            </select>
          </div>

          <div className="about-section">
            <div className="about-icon">
              🔔
            </div>

            <div>
              <strong>
                FocusBell
              </strong>

              <span>
                Stay on schedule.
              </span>

              <small>
                Version 1.0
              </small>
            </div>
          </div>
        </div>
      )}

      {!showSettings && (
        <>
          <div className="card">
            <h2>
              Set an Alarm
            </h2>

            <label>
              Alarm Name
            </label>

            <input
              type="text"
              placeholder="e.g. Study session"
              value={
                alarmName
              }
              onChange={(e) =>
                setAlarmName(
                  e.target.value
                )
              }
            />

            <label>
              Time
            </label>

            <TimeField
              value={
                alarmTime
              }
              onChange={
                setAlarmTime
              }
              onOpenClock={() =>
                openClockPicker(
                  'new'
                )
              }
              dark={
                settings.theme ===
                'dark'
              }
            />

            <label>
              Repeat
            </label>

            <select
              value={
                repeat
              }
              onChange={(e) =>
                setRepeat(
                  e.target.value
                )
              }
            >
              <option>
                Once
              </option>

              <option>
                Every day
              </option>

              <option>
                Every weekday
              </option>

              <option>
                Every week
              </option>
            </select>

            <label>
              Alarm Sound
            </label>

            <select
              value={
                sound
              }
              onChange={(e) =>
                setSound(
                  e.target.value
                )
              }
            >
              {SOUNDS.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {
                      item.label
                    }
                  </option>
                )
              )}
            </select>

            <button
              onClick={
                setAlarm
              }
            >
              🔔 Set Alarm
            </button>
          </div>

          <div className="upcoming">
            <div className="section-title">
              <h2>
                Upcoming Alarms
              </h2>

              <span>
                {
                  alarms.length
                }
              </span>
            </div>

            {alarms.length ===
            0 ? (
              <div className="empty">
                <div className="empty-icon">
                  ⏰
                </div>

                <p>
                  No alarms scheduled
                </p>

                <small>
                  Your alarms will appear here.
                </small>
              </div>
            ) : (
              <div className="alarm-list">
                {alarms.map(
                  (
                    alarm
                  ) => (
                    <div
                      className={`alarm-item ${
                        !alarm.enabled
                          ? 'disabled'
                          : ''
                      }`}
                      key={
                        alarm.id
                      }
                    >
                      <div className="alarm-info">
                        <div className="alarm-top">
                          <strong>
                            {
                              alarm.name
                            }
                          </strong>

                          <span
                            className={`status-badge ${
                              alarm.enabled
                                ? 'active'
                                : 'inactive'
                            }`}
                          >
                            {alarm.enabled
                              ? 'Active'
                              : 'Off'}
                          </span>
                        </div>

                        <div className="alarm-time">
                          {
                            formatDisplayTime(
                              alarm.time
                            )
                          }
                        </div>

                        <div className="alarm-details">
                          <span>
                            🔁{' '}
                            {
                              alarm.repeat
                            }
                          </span>

                          <span>
                            🔊{' '}
                            {alarm.sound ===
                            'digital.mp3'
                              ? 'Digital Alarm'
                              : alarm.sound ===
                                'gentle.mp3'
                              ? 'Gentle Wake'
                              : 'Classic Bell'}
                          </span>
                        </div>
                      </div>

                      <div className="alarm-actions">
                        <button
                          className={`toggle-button ${
                            alarm.enabled
                              ? 'on'
                              : 'off'
                          }`}
                          onClick={() =>
                            toggleAlarm(
                              alarm.id
                            )
                          }
                        >
                          <span className="toggle-dot" />

                          {alarm.enabled
                            ? 'ON'
                            : 'OFF'}
                        </button>

                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            openEditAlarm(
                              alarm
                            )
                          }
                        >
                          ✏️
                        </button>

                        <button
                          className="delete-button"
                          onClick={() =>
                            deleteAlarm(
                              alarm.id
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {history.length >
            0 && (
            <div className="upcoming past-alarms">
              <div className="section-title">
                <h2>
                  Past Alarms
                </h2>

                <span>
                  {
                    history.length
                  }
                </span>
              </div>

              <div className="alarm-list">
                {history.map(
                  (
                    item
                  ) => (
                    <div
                      className="alarm-item"
                      key={
                        item.id
                      }
                    >
                      <div className="alarm-info">
                        <strong>
                          ✓{' '}
                          {
                            item.name
                          }
                        </strong>

                        <span>
                          {
                            item.time
                          }
                          {' · '}
                          {
                            item.repeat
                          }
                        </span>

                        <small>
                          Dismissed{' '}
                          {
                            item.dismissedAt
                          }
                        </small>
                      </div>
                    </div>
                  )
                )}
              </div>

              <button
                className="clear-history"
                onClick={
                  clearHistory
                }
              >
                Clear History
              </button>
            </div>
          )}
        </>
      )}

      {showEditModal && (
        <div
          className="modal-overlay"
          onClick={
            cancelEditAlarm
          }
        >
          <div
            className="time-modal edit-alarm-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-heading">
              <div>
                <h2>
                  Edit Alarm
                </h2>

                <p>
                  Update your alarm
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  cancelEditAlarm
                }
              >
                ×
              </button>
            </div>

            <label>
              Alarm Name
            </label>

            <input
              type="text"
              value={
                editAlarmName
              }
              onChange={(e) =>
                setEditAlarmName(
                  e.target.value
                )
              }
              placeholder="Alarm name"
            />

            <label>
              Time
            </label>

            <TimeField
              value={
                editAlarmTime
              }
              onChange={
                setEditAlarmTime
              }
              onOpenClock={() =>
                openClockPicker(
                  'edit'
                )
              }
              dark={
                settings.theme ===
                'dark'
              }
            />

            <label>
              Repeat
            </label>

            <select
              value={
                editRepeat
              }
              onChange={(e) =>
                setEditRepeat(
                  e.target.value
                )
              }
            >
              <option>
                Once
              </option>

              <option>
                Every day
              </option>

              <option>
                Every weekday
              </option>

              <option>
                Every week
              </option>
            </select>

            <label>
              Alarm Sound
            </label>

            <select
              value={
                editSound
              }
              onChange={(e) =>
                setEditSound(
                  e.target.value
                )
              }
            >
              {SOUNDS.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {
                      item.label
                    }
                  </option>
                )
              )}
            </select>

            <div className="modal-buttons">
              <button
                className="modal-cancel"
                onClick={
                  cancelEditAlarm
                }
              >
                Cancel
              </button>

              <button
                className="modal-update"
                onClick={
                  saveEditedAlarm
                }
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showClockPicker && (
        <div
          className="modal-overlay clock-picker-overlay"
          onClick={
            cancelClockPicker
          }
        >
          <div
            className="time-modal clock-picker-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-heading clock-heading">
              <div>
                <h2>
                  Select Time
                </h2>

                <p>
                  {pickerStep ===
                  'hour'
                    ? 'Select hour'
                    : 'Drag minute hand'}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  cancelClockPicker
                }
              >
                ×
              </button>
            </div>

            <div className="clock-time-display">
              <button
                type="button"
                className={
                  pickerStep ===
                  'hour'
                    ? 'clock-time-part active'
                    : 'clock-time-part'
                }
                onClick={() =>
                  setPickerStep(
                    'hour'
                  )
                }
              >
                {String(
                  pickerHour
                ).padStart(
                  2,
                  '0'
                )}
              </button>

              <span>
                :
              </span>

              <button
                type="button"
                className={
                  pickerStep ===
                  'minute'
                    ? 'clock-time-part active'
                    : 'clock-time-part'
                }
                onClick={() =>
                  setPickerStep(
                    'minute'
                  )
                }
              >
                {String(
                  pickerMinute
                ).padStart(
                  2,
                  '0'
                )}
              </button>
            </div>

            <div
              ref={
                clockRef
              }
              className={`analog-clock ${
                pickerStep ===
                'minute'
                  ? 'minute-mode'
                  : 'hour-mode'
              }`}
              onPointerDown={
                pickerStep ===
                'minute'
                  ? handleMinutePointerDown
                  : undefined
              }
              onPointerMove={
                pickerStep ===
                'minute'
                  ? handleMinutePointerMove
                  : undefined
              }
              onPointerUp={
                pickerStep ===
                'minute'
                  ? handleMinutePointerUp
                  : undefined
              }
              onPointerCancel={() => {
                draggingMinute.current =
                  false
              }}
            >
              {pickerStep ===
                'hour' &&
                renderClockLabels(
                  true
                )}

              {pickerStep ===
                'hour' && (
                <div
                  className="clock-hand hour-hand"
                  style={{
                    transform:
                      `translate(-50%, -100%) rotate(${
                        pickerHour *
                          30 -
                        360
                      }deg)`,
                  }}
                />
              )}

              {pickerStep ===
                'minute' && (
                <>
                  <div className="minute-ticks">
                    {renderMinuteTicks()}
                  </div>

                  {renderClockLabels(
                    false
                  )}

                  <div
                    className="clock-hand minute-hand"
                    style={{
                      transform:
                        `translate(-50%, -100%) rotate(${
                          pickerMinute *
                          6
                        }deg)`,
                    }}
                  />
                </>
              )}

              <div className="clock-center-dot" />
            </div>

            <div className="period-buttons">
              <button
                type="button"
                className={
                  pickerPeriod ===
                  'AM'
                    ? 'period-button active'
                    : 'period-button'
                }
                onClick={() =>
                  setPickerPeriod(
                    'AM'
                  )
                }
              >
                AM
              </button>

              <button
                type="button"
                className={
                  pickerPeriod ===
                  'PM'
                    ? 'period-button active'
                    : 'period-button'
                }
                onClick={() =>
                  setPickerPeriod(
                    'PM'
                  )
                }
              >
                PM
              </button>
            </div>

            <div className="selected-time-preview">
              Selected:{' '}
              <strong>
                {String(
                  pickerHour
                ).padStart(
                  2,
                  '0'
                )}
                :
                {String(
                  pickerMinute
                ).padStart(
                  2,
                  '0'
                )}{' '}
                {
                  pickerPeriod
                }
              </strong>
            </div>

            <div className="clock-modal-buttons">
              <button
                type="button"
                className="clock-cancel-button"
                onClick={
                  cancelClockPicker
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="clock-confirm-button"
                onClick={
                  confirmClockTime
                }
              >
                Set Time
              </button>
            </div>
          </div>
        </div>
      )}

      {showTimeModal && (
        <div className="modal-overlay">
          <div className="time-modal">
            <div className="modal-icon">
              🔔
            </div>

            <h2>
              Update Alarm
            </h2>

            <p>
              The original alarm
              time has already
              passed.
            </p>

            <label>
              Choose a new time
              for today
            </label>

            <input
              type="time"
              value={
                newAlarmTime
              }
              onChange={(e) =>
                setNewAlarmTime(
                  e.target.value
                )
              }
              autoFocus
            />

            <div className="modal-buttons">
              <button
                className="modal-cancel"
                onClick={
                  cancelNewAlarmTime
                }
              >
                Cancel
              </button>

              <button
                className="modal-update"
                onClick={
                  confirmNewAlarmTime
                }
              >
                Update Alarm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App