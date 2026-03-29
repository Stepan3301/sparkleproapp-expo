import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Button from '../components/ui/Button';
import LoadingScreen from '../components/ui/LoadingScreen';
import TextInput from '../components/ui/TextInput';
import StepIndicator from '../components/ui/StepIndicator';

const TestScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);

  return (
    <View style={styles.container}>
      <LoadingScreen isLoading={loading} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Component Test Screen</Text>
        <Text style={styles.subtitle}>Testing React Native Components</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buttons</Text>
          
          <Button variant="primary" size="md" onPress={() => console.log('Primary pressed')}>
            Primary Button
          </Button>
          
          <Button variant="secondary" size="md" style={styles.buttonSpacing}>
            Secondary Button
          </Button>
          
          <Button variant="nav-back" size="md" style={styles.buttonSpacing}>
            Back Button
          </Button>
          
          <Button variant="nav-next" size="md" style={styles.buttonSpacing}>
            Next Button
          </Button>
          
          <Button variant="fab" onPress={() => setLoading(!loading)} style={styles.buttonSpacing}>
            {loading ? 'Stop' : 'Test Loading'}
          </Button>
          
          <Button variant="selection" selected={true} style={styles.buttonSpacing}>
            Selected
          </Button>
          
          <Button variant="selection" selected={false} style={styles.buttonSpacing}>
            Not Selected
          </Button>
          
          <Button variant="toggle" active={true} style={styles.buttonSpacing}>
            Toggle Active
          </Button>
          
          <Button variant="toggle" active={false} style={styles.buttonSpacing}>
            Toggle Inactive
          </Button>
          
          <Button disabled={true} style={styles.buttonSpacing}>
            Disabled Button
          </Button>
          
          <Button loading={true} style={styles.buttonSpacing}>
            Loading Button
          </Button>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Text Inputs</Text>
          
          <TextInput
            label="Email Address"
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            required
          />
          
          <TextInput
            label="Phone Number"
            placeholder="Enter your phone"
            keyboardType="phone-pad"
            error="This field is required"
          />
          
          <TextInput
            label="Helper Text"
            placeholder="This has helper text"
            helperText="This is helpful information"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step Indicator</Text>
          
          <StepIndicator currentStep={1} totalSteps={4} />
          <View style={styles.spacer} />
          <StepIndicator currentStep={2} totalSteps={4} />
          <View style={styles.spacer} />
          <StepIndicator currentStep={3} totalSteps={4} />
          <View style={styles.spacer} />
          <StepIndicator currentStep={4} totalSteps={4} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  buttonSpacing: {
    marginTop: 12,
  },
  spacer: {
    height: 24,
  },
});

export default TestScreen;
