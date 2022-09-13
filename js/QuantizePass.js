import * as THREE from './three.js';
import {FullScreenQuad, Pass} from './EffectComposer.js';
import { QuantizeShader } from './QuantizeShader.js';

// ( function () {

	class QuantizePass extends Pass {

		constructor( dt_size = 64 ) {

			super();
			const shader = QuantizeShader;
			this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );
			this.material = new THREE.ShaderMaterial( {
				uniforms: this.uniforms,
				vertexShader: shader.vertexShader,
				fragmentShader: shader.fragmentShader
			} );
			this.fsQuad = new FullScreenQuad( this.material );
		}

		render( renderer, writeBuffer, readBuffer
			/*, deltaTime, maskActive */
		) {

			this.uniforms[ 'tDiffuse' ].value = readBuffer.texture;
			this.curF ++;

			if ( this.renderToScreen ) {
				renderer.setRenderTarget( null );
				this.fsQuad.render( renderer );

			} else {
				renderer.setRenderTarget( writeBuffer );
				if ( this.clear ) renderer.clear();
				this.fsQuad.render( renderer );
			}

		}

		generateHeightmap( dt_size ) {

			const data_arr = new Float32Array( dt_size * dt_size );
			const length = dt_size * dt_size;

			for ( let i = 0; i < length; i ++ ) {
				const val = THREE.MathUtils.randFloat( 0, 1 );
				data_arr[ i ] = val;
			}

			const texture = new THREE.DataTexture( data_arr, dt_size, dt_size, THREE.RedFormat, THREE.FloatType );
			texture.needsUpdate = true;
			return texture;
		}
	}
// } )();

export {QuantizePass};