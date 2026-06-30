import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSimpleTranslation } from '../../utils/i18n';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const CIRCLE_SIZE = 56;
const CONNECTOR_H = 4;

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  const { t } = useSimpleTranslation();
  const stepLabels = [
    t('ui.bookingFlow.stepService', 'Service'),
    t('ui.bookingFlow.stepExtras', 'Extras'),
    t('ui.bookingFlow.stepSchedule', 'Schedule'),
    t('ui.bookingFlow.stepContact', 'Contact'),
  ];

  const getStepColors = (stepNumber: number): [string, string] => {
    if (stepNumber < currentStep) return ['#10B981', '#34D399'];
    if (stepNumber === currentStep) return ['#2563EB', '#3B82F6'];
    return ['#E5E7EB', '#9CA3AF'];
  };

  const getTextColor = (stepNumber: number) =>
    stepNumber <= currentStep ? '#FFFFFF' : '#6B7280';

  const getLabelColor = (stepNumber: number) => {
    if (stepNumber === currentStep) return '#2563EB';
    if (stepNumber < currentStep) return '#10B981';
    return '#9CA3AF';
  };

  const getConnectorColors = (stepNumber: number): [string, string] =>
    stepNumber < currentStep ? ['#10B981', '#34D399'] : ['#E5E7EB', '#D1D5DB'];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <React.Fragment key={stepNumber}>
              <View style={styles.stepCol}>
                <View style={[
                  styles.stepCloud,
                  isCurrent && styles.stepCloudCurrent,
                  isCompleted && styles.stepCloudCompleted,
                ]}>
                  <LinearGradient
                    colors={getStepColors(stepNumber)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.stepGradient}
                  >
                    <View style={[styles.decorativeBubble, { backgroundColor: getStepColors(stepNumber)[0] }]} />
                    <Text style={[styles.stepNumber, { color: getTextColor(stepNumber) }]}>
                      {stepNumber}
                    </Text>
                  </LinearGradient>
                </View>
                <Text style={[styles.label, { color: getLabelColor(stepNumber) }]}>
                  {stepLabels[index]}
                </Text>
              </View>
              {index < totalSteps - 1 && (
                <View style={styles.connectorWrap}>
                  <LinearGradient
                    colors={getConnectorColors(stepNumber)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.connector}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 28, paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  stepCol: { alignItems: 'center', width: 64 },
  stepCloud: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: 16, overflow: 'hidden' },
  stepCloudCurrent: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  stepCloudCompleted: {
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  stepGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  decorativeBubble: {
    position: 'absolute', top: -8, right: -8, width: 18, height: 18, borderRadius: 9, opacity: 0.7,
  },
  stepNumber: {
    fontSize: 17, fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  label: { marginTop: 6, fontSize: 10, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8 },
  connectorWrap: {
    flex: 1, height: CONNECTOR_H, borderRadius: 2, overflow: 'hidden', marginTop: (CIRCLE_SIZE - CONNECTOR_H) / 2,
  },
  connector: { width: '100%', height: '100%' },
});

export default StepIndicator;
